// Minimal mock of next/server for API route unit tests

export class NextRequest {}

export const NextResponse = {
  json: (body: any, init?: { status?: number }) => {
    const status = init?.status ?? 200;
    return {
      status,
      async json() {
        return body;
      },
    } as any;
  },
};
