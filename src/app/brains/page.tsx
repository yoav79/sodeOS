import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import BrainsClient from './BrainsClient';

export const dynamic = 'force-dynamic';

export default async function BrainsIndexPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  // Retrieve brains memberships for the current user, ordered by brain update time
  const memberships = await db.brainMember.findMany({
    where: {
      userId: currentUser.id,
    },
    orderBy: {
      brain: {
        updatedAt: 'desc',
      },
    },
    include: {
      brain: {
        include: {
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

  return (
    <BrainsClient
      user={{
        name: currentUser.name,
        email: currentUser.email,
      }}
      brains={brains}
    />
  );
}
