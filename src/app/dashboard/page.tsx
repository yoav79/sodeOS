import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import DashboardClient from './DashboardClient';

export const revalidate = 0; // Force dynamic rendering

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  // 1. Get brains where the current user is a member
  const memberships = await db.brainMember.findMany({
    where: { userId: currentUser.id },
    include: {
      brain: {
        select: {
          id: true,
          name: true,
          description: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              nodes: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
    },
  });

  const brains = memberships.map((m) => ({
    id: m.brain.id,
    name: m.brain.name,
    description: m.brain.description,
    visibility: m.brain.visibility,
    role: m.role,
    activeNodesCount: m.brain._count.nodes,
    updatedAt: m.brain.updatedAt.toISOString(),
  }));
  const brainIds = brains.map((b) => b.id);

  interface RecentNode {
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    updaterName: string;
    brainName: string;
    brainId: string;
  }

  interface RecentActivity {
    id: string;
    nodeId: string;
    nodeTitle: string;
    brainId: string;
    changeNote: string;
    createdAt: string;
    saverName: string;
  }

  let totalNodes = 0;
  let needsReviewNodes = 0;
  let totalVersions = 0;
  let recentNodes: RecentNode[] = [];
  let recentActivity: RecentActivity[] = [];

  if (brainIds.length > 0) {
    // 2. Count total nodes in these brains
    totalNodes = await db.node.count({
      where: {
        brainId: { in: brainIds },
        deletedAt: null,
      },
    });

    // 3. Count nodes in 'needs_review' status
    needsReviewNodes = await db.node.count({
      where: {
        brainId: { in: brainIds },
        status: 'needs_review',
        deletedAt: null,
      },
    });

    // 4. Count total versions saved across these brains
    totalVersions = await db.nodeVersion.count({
      where: {
        node: {
          brainId: { in: brainIds },
          deletedAt: null,
        },
      },
    });

    // 5. Get recently updated nodes
    const dbRecentNodes = await db.node.findMany({
      where: {
        brainId: { in: brainIds },
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
      include: {
        updater: {
          select: {
            name: true,
            email: true,
          },
        },
        brain: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    recentNodes = dbRecentNodes.map((n) => ({
      id: n.id,
      title: n.title,
      status: n.status,
      updatedAt: n.updatedAt.toISOString(),
      updaterName: n.updater.name,
      brainName: n.brain.name,
      brainId: n.brain.id,
    }));

    // 6. Get recent activity from node_versions
    const dbRecentActivity = await db.nodeVersion.findMany({
      where: {
        node: {
          brainId: { in: brainIds },
          deletedAt: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: {
        saver: {
          select: {
            name: true,
            email: true,
          },
        },
        node: {
          select: {
            title: true,
            brainId: true,
          },
        },
      },
    });

    recentActivity = dbRecentActivity.map((v) => ({
      id: v.id,
      nodeId: v.nodeId,
      nodeTitle: v.node.title,
      brainId: v.node.brainId,
      changeNote: v.changeNote || 'Guardó una nueva versión',
      createdAt: v.createdAt.toISOString(),
      saverName: v.saver.name,
    }));
  }

  return (
    <DashboardClient
      user={{
        name: currentUser.name,
        email: currentUser.email,
      }}
      brains={brains}
      metrics={{
        totalBrains: brains.length,
        totalNodes,
        needsReviewNodes,
        totalVersions,
      }}
      recentNodes={recentNodes}
      recentActivity={recentActivity}
    />
  );
}
