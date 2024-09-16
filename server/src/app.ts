import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { surveyRouter } from './trpc-router'

const server = createHTTPServer({router:surveyRouter});
var port: number = 3000;
if(process.env.PORT !== undefined) port = +process.env.PORT;
server.listen(port)
