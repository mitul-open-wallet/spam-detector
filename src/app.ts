
import { TransactionsFetcher } from './controllers/transactionsFetcher';
import { appConfig } from './config';
import express, { Request, Response, Application } from 'express';
import { SpamDetector } from './controllers/spamDetector';

const app: Application = express();

app.use(express.json());


app.post("/accidentalTransfer/check", async (request, response) => {
    const { userAddress } = request.body;

    try {
        let transfers = await new SpamDetector().findAccidentalTransactions(userAddress)
        response.status(200).send({"transfers": transfers})
    } catch (error) {
        response.status(500).send({
            error: "Internal server error"
        })
    }
})


app.post("/infections/check", async (request: Request, response: Response) => {
    const { userAddress, targetAddress = undefined } = request.body;

    if (typeof userAddress !== 'string' || !userAddress) {
        response.status(400).send({
            error: "userAddress (string) is required"
        });
        return;
    }

    if (targetAddress !== undefined && typeof targetAddress !== 'string') {
        response.status(400).send({
            error: "targetAddress must be a string or undefined"
        });
        return;
    }

    try {
        let infectedTransactions = await new SpamDetector().findInfections(userAddress, targetAddress);
        response.status(200).send({"infections": infectedTransactions});
    } catch (error) {
        response.status(500).send({
            error: "Internal server error"
        });
    }
});

app.post("/spam/check", async (request: Request, response: Response) => {
    const { txHash, address } = request.body;
    console.log(`Request with hash ${txHash} arrived at: ${new Date().toLocaleString()}`)

    if (typeof txHash !== 'string' || !txHash) {
        response.status(400).send({
            error: "txHash (string) is required"
        });
        return
    }
    if (typeof address !== 'string' || !address) {
        response.status(400).send({
            error: "address (string) is required"
        });
        return
    }

    try {
        let isSpam = await new SpamDetector().isSpam(
            txHash,
            address
        );
        console.log(`Request with hash ${txHash} processed at: ${new Date().toLocaleString()}`)
        response.status(200).send({ isSpam: isSpam });
    } catch (error) {
        console.error("Error checking spam status:", error);
        response.status(500).send({
            error: `Transaction with txHash: ${txHash} is not associated with ${address}`
        });
    }
});

let start = (async () => {
    let instance = TransactionsFetcher.getInstance()
    await instance.initDependencies()

    app.listen(appConfig.port, () => {
        console.log(`Server is running at ${appConfig.port}`);
    });
})

start();

