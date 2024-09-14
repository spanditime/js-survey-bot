import { createTRPCClient, httpBatchLink} from '@trpc/client'
import { SurveyRouter } from '../../server/export'
export { Pupil } from '../../server/export'

var url : string = "";
if(process.env.TRPC_SERVER !== undefined){
  url = process.env.TRPC_SERVER;
}

export const trpc = createTRPCClient<SurveyRouter>({
  links: [
    httpBatchLink({url:url})
  ]
})
