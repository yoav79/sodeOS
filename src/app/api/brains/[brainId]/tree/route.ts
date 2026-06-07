import { NextResponse } from 'next/server';
import { getBrainNodeTree } from '@/services/nodeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brainId: string }> }
) {
  try {
    const { brainId } = await params;

    if (!brainId) {
      return NextResponse.json({ error: 'brainId is required' }, { status: 400 });
    }

    const tree = await getBrainNodeTree(brainId);
    return NextResponse.json({ tree }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching node tree:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
