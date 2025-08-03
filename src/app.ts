
import { TransactionsFetcher } from './controllers/transactionsFetcher';
import { appConfig } from './config';
import express, { Application } from 'express';
import routes from './routes'

const app: Application = express();
app.use(express.json());

app.use("/", routes)

let start = (async () => {
    let instance = TransactionsFetcher.getInstance()
    await instance.initDependencies()

    app.listen(appConfig.port, () => {
        console.log(`Server is running at ${appConfig.port}`);
    });
})
start();

