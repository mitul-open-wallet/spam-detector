export interface AppConfig {
    port: string
    moralisAPIKey: string
    heliumAPIKey: string
    solanaMetadataURL: (contractAddress: string) => string
    heliumBaseURL: (apiKey: string) => string
}