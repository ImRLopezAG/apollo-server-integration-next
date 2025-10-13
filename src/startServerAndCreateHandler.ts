import type { ServerResponse } from 'node:http'
import { parse } from 'node:url'
import type { ApolloServer, BaseContext, ContextFunction } from '@apollo/server'
import { getBody } from './lib/getBody'
import { getHeaders } from './lib/getHeaders'
import { isNextApiRequest } from './lib/isNextApiRequest'

interface Options<Req extends Request, Context extends BaseContext> {
	context?: ContextFunction<[Req], Context>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultContext: ContextFunction<[], any> = async () => ({})

function startServerAndCreateHandler<
	Req extends Request = Request,
	Context extends BaseContext = object,
>(server: ApolloServer<Context>, options?: Options<Req, Context>) {
	server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests()

	const contextFunction = options?.context || defaultContext

	async function handler<HandlerReq extends Req>(
		req: HandlerReq,
		res: ServerResponse,
	): Promise<unknown>
	async function handler<HandlerReq extends Req>(
		req: HandlerReq,
		res?: undefined,
	): Promise<Response>
	async function handler(req: Req, res: ServerResponse | undefined) {
		const httpGraphQLResponse = await server.executeHTTPGraphQLRequest({
			context: () => contextFunction(req),
			httpGraphQLRequest: {
				body: await getBody(req),
				headers: getHeaders(req),
				method: req.method || 'POST',
				search: req.url ? parse(req.url).search || '' : '',
			},
		})

		if (isNextApiRequest(req)) {
      if (!res) {
        throw new Error('Response object is required for Next.js API routes')
			}
			for (const [key, value] of httpGraphQLResponse.headers) {
        res.setHeader(key, value)
			}
      
			// Set status code
			res.statusCode = httpGraphQLResponse.status || 200
      
			// Handle complete response body
			if (httpGraphQLResponse.body.kind === 'complete') {
        res.end(httpGraphQLResponse.body.string)
				return
			}
      
			// Handle chunked response body
			if (httpGraphQLResponse.body.kind === 'chunked') {
        for await (const chunk of httpGraphQLResponse.body.asyncIterator) {
          res.write(chunk)
				}
				res.end()
			}

      return
		}
    
    // Set response headers
    const headers: Record<string, string> = {};
    for (const [key, value] of httpGraphQLResponse.headers) {
      headers[key] = value;
    }

    return new Response(
      httpGraphQLResponse.body.kind === 'complete'
        ? httpGraphQLResponse.body.string
        : new ReadableStream({
            async pull(controller) {
              if (httpGraphQLResponse.body.kind === 'chunked') {
                const { value, done } = await httpGraphQLResponse.body.asyncIterator.next();

                if (done) {
                  controller.close();
                } else {
                  controller.enqueue(value);
                }
              }
            },
          }),
      { headers, status: httpGraphQLResponse.status || 200 },
    );
	}

	return handler
}

export { startServerAndCreateHandler }
