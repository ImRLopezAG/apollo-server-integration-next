import { getBody } from './lib/getBody';
import { getHeaders } from './lib/getHeaders';
import type { ApolloServer, BaseContext, ContextFunction } from '@apollo/server';
import type { ServerResponse } from 'node:http';
import { parse } from 'node:url';

interface Options<Req extends Request, Context extends BaseContext> {
  context?: ContextFunction<[Req], Context>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultContext: ContextFunction<[], any> = async () => ({});

function startServerAndCreateNextHandler<Req extends Request = Request, Context extends BaseContext = object>(
  server: ApolloServer<Context>,
  options?: Options<Req, Context>,
) {
  server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  const contextFunction = options?.context || defaultContext;

  async function handler(req: Req, res: ServerResponse) {
    const httpGraphQLResponse = await server.executeHTTPGraphQLRequest({
      context: () => contextFunction(req),
      httpGraphQLRequest: {
        body: await getBody(req),
        headers: getHeaders(req),
        method: req.method || 'POST',
        search: req.url ? parse(req.url).search || '' : '',
      },
    });

    // Set response headers
    for (const [key, value] of httpGraphQLResponse.headers) {
      res.setHeader(key, value);
    }

    // Set status code
    res.statusCode = httpGraphQLResponse.status || 200;

    // Handle complete response body
    if (httpGraphQLResponse.body.kind === 'complete') {
      res.end(httpGraphQLResponse.body.string);
      return;
    }

    // Handle chunked response body
    if (httpGraphQLResponse.body.kind === 'chunked') {
      for await (const chunk of httpGraphQLResponse.body.asyncIterator) {
        res.write(chunk);
      }
      res.end();
    }
  }

  return handler;
}

export { startServerAndCreateNextHandler };
