
import { TransactionsFetcher } from './controllers/transactionsFetcher';
import { appConfig } from './config';
import express, { Request, Response, Application } from 'express';
import { SpamDetector } from './controllers/spamDetector';
import { request } from 'http';
import { aw } from '@buildonspark/spark-sdk/dist/spark-DjR1b3TC';

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
            error: "userAdrress (string) is required"
        });
        return
    }
    if ((!targetAddress) && (typeof targetAddress !  == 'string')) {
        response.status(400).send({
            error: "tragetAddress must be a string"
        });
        return
    }

    try {
        let infectedTransactions = await new SpamDetector().findInfections(userAddress, targetAddress)
        response.status(200).send({"infections": infectedTransactions})
    } catch (error) {
        response.status(500).send({
            error: "Internal server error"
        })
    }
})

app.post("/spam/check", async (request: Request, response: Response) => {
    const { txHash, address } = request.body;

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

