
import { TransactionsFetcher } from './controllers/transactionsFetcher';
import { appConfig } from './config';
import express, { Request, Response, Application } from 'express';
import { SpamDetector } from './controllers/spamDetector';
import { request } from 'http';

const app: Application = express();

app.use(express.json());

app.get("/nudge", async (request: Request, response: Response) => {
    response.status(200).send({ "response": "Hey!"})
})

app.post("/findInfections", async (request: Request, response: Response) => {
    const { userAddress, targetAddress } = request.body;

    // Validate required parameters and types
    if (typeof userAddress !== 'string' || !userAddress) {
        response.status(400).send({
            error: "userAdrress (string) is required"
        });
        return
    }
    if (typeof targetAddress !== 'string' || !targetAddress) {
        response.status(400).send({
            error: "tragetAddress (string) is required"
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

app.post("/isSpam", async (request: Request, response: Response) => {
    const { txHash, address } = request.body;

    // Validate required parameters and types
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
            error: "Internal server error"
        });
    }
});

let start = (async () => {
    let instance = TransactionsFetcher.getInstance()
    await instance.initDependencies()

    app.listen(appConfig.port, () => {
        console.log(`Server is running at http://localhost:${appConfig.port}`);
    });
})

start();

