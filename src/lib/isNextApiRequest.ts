const isNextApiRequest = (req: Request) => 'query' in req;

export { isNextApiRequest };
