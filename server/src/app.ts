import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { surveyRouter } from './trpc-router'

const server = createHTTPServer({router:surveyRouter});

server.listen(3000)
