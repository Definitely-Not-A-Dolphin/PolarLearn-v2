import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import type { ReactFormState } from "react-dom/client";
import { renderToReadableStream } from "react-dom/server.edge";
import {
  unstable_routeRSCServerRequest as routeRSCServerRequest,
  unstable_RSCStaticRouter as RSCStaticRouter,
} from "react-router";
import pkg from "package.json"

export async function generateHTML(
  request: Request,
  serverResponse: Response,
): Promise<Response> {
  return await routeRSCServerRequest({
    request,
    serverResponse,
    createFromReadableStream,
    async renderHTML(getPayload, options) {
      const payload = await getPayload();
      const formState =
        payload.type === "render" ? (await payload.formState) as ReactFormState : undefined;
      const bootstrapScriptContent =
        // @ts-expect-error - this is the internal vite api only exposed in node_modules.
        await import.meta.viteRsc.loadBootstrapScriptContent("index");

      const stream = await renderToReadableStream(
        <RSCStaticRouter getPayload={getPayload} />,
        {
          ...options,
          bootstrapScriptContent,
          formState,
          signal: request.signal,
        },
      );

      const encoder = new TextEncoder();
      // DO NOT REMOVE TEXT IF CREATING A FORK
      // ATTRIBUTIION IS REQUIRED TO COMPLY WITH AGPL-3.0
      // Section 7b: "Requiring preservation of specified reasonable legal notices or author attributions in that material or in the Appropriate Legal Notices displayed by works containing it"
      // You are allowed to edit the "PolarLearn v..." text, but you must keep the attribution to PolarLearn and/or PolarNL ("Powered by PolarLearn") in the comment, and you must keep the comment in the HTML source of the page. 
      // You can also add additional information to the comment if you wish, but you cannot remove the attribution to PolarLearn.
      const comment = encoder.encode(`<!-- PolarLearn ${pkg.version}\n  Powered by PolarLearn!\n  We are open source: https://github.com/polarnl/polarlearn-v2 -->`);

      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(comment);

          const reader = stream.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }
              if (value) {
                controller.enqueue(value);
              }
            }
          } finally {
            controller.close();
          }
        },
        cancel(reason) {
          stream.cancel(reason);
        },
      });

      return body;
    },
  });
}
