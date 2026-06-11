import app from '@/app.ts'
import { env } from '@/config/env.ts'

const server = app.listen(env.port, () => {
    const address = server.address();
    if (typeof address === 'object' && address){
        const host = address.address==='::'? 'localhost': address.address;
        console.log(`Server running on http://${host}:${address.port}/api/${env.apiVersion}`); 
        console.log(`Health check: http://${host}:${address.port}/api/${env.apiVersion}/health`);
    }
   
});
