
import { TransactionsFetcher } from './controllers/transactionsFetcher';
import { appConfig } from './config';
import express, { Application } from 'express';
import routes from './routes'
import { RedisClient } from './redis/redisClient';

const app: Application = express();
app.use(express.json());

app.use("/", routes)

let start = (async () => {
    await RedisClient.getInstance(appConfig).connect()
    let instance = TransactionsFetcher.getInstance()
    await instance.initDependencies()

    app.listen(appConfig.port, () => {
        console.log(`server started at port ${appConfig.port}`)
    });
})
start();

