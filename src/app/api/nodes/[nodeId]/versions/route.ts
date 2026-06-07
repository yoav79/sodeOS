import { NextResponse } from 'next/server';
import { getNodeVersions } from '@/services/nodeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    const versions = await getNodeVersions(nodeId);

    if (!versions) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado' }, { status: 404 });
    }

    return NextResponse.json({ versions }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching node versions:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
