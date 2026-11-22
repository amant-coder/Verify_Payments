import { NextRequest } from "next/server";
import { getOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for instant real-time updates when Firebase Client SDK
 * is not configured or as an instant zero-latency channel.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const send = (data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      // Send initial data immediately
      const initial = await getOrder(orderId);
      if (initial) send(initial);

      let lastStatus = initial?.status;
      let lastUtr = initial?.utr;
      let tick = 0;

      // Poll interval: 2500ms reduces DB reads while keeping UI responsive
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        tick++;
        // Send keepalive heartbeat comment every ~15s (every 6 ticks) to prevent proxy timeouts
        if (tick % 6 === 0) {
          try {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch {
            isClosed = true;
          }
        }

        try {
          const current = await getOrder(orderId);
          if (current) {
            if (current.status !== lastStatus || current.utr !== lastUtr) {
              lastStatus = current.status;
              lastUtr = current.utr;
              send(current);

              // Close stream once order reaches final state
              if (current.status === "APPROVED" || current.status === "REJECTED") {
                isClosed = true;
                clearInterval(interval);
                try {
                  controller.close();
                } catch {}
              }
            }
          }
        } catch {
          // ignore stream poll error
        }
      }, 2500);

      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
