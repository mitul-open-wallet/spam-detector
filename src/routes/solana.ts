import { Request, Response, Router } from "express";

interface SolanaData {
    description: string
}

const router = Router();

router.get("/check", async (request: Request, response: Response) => {
    let { userAddress } = request.params
    let apiKey = "fffb28f8-e2a7-461b-926f-2036a0ccb73c";
    let userAddress1 = "ABfsbFvoyvxip6nTeYZmUZA3kmysJEd3Mif7ifzHj18r"
    const networkResponse = await fetch(`https://api.helius.xyz/v0/addresses/${userAddress1}/transactions?api-key=${apiKey}`)
    let data: SolanaData = await networkResponse.json()
    response.status(200).send({ response: data })
});

export default router;