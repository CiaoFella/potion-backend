import { Client } from "../models/Client";
import { CRMCategory } from "../models/CRMCategory";
import { myEmitter } from "./eventEmitter";
import { broadcastToUserSessions, getIoInstance } from "./socket";

export function subscribeToInternalEvents() {
    //When a new User is registered, create default CRM categories for them
    myEmitter.on("new-user", (data) => {
        const run = async () => {
            await CRMCategory.insertMany(
                [
                    "New Leads",
                    "Engaged",
                    "Proposal Sent",
                    "Negotiation",
                    "Won",
                    "Closed",
                ].map((item) => ({
                    name: item,
                    createdBy: data?._id,
                }))
            );
        };
        run();
    });

    //When a new CRM item is created, register it as a client too
    myEmitter.on("new-item", (data) => {
        const run = async () => {
            const client = new Client({
                name: data?.companyName,
                companyName: data?.companyName,
                entityType: "Corporation",
                address: "",
                currency: "USD",
                language: "",
                contacts: [
                    {
                        name: data?.name,
                        email: data?.email,
                        phone: "",
                        countryCode: ""
                    }
                ],
                contracts: [],
                projects: [],
                status: "Lead",
                createdBy: data?.createdBy,
            });
            await client.save();
        };
        run();
    });

    
    myEmitter.on('databaseChange', (changeData) => {
        const { eventType, collectionName, documentId, userId } = changeData;
        if (userId) {
            broadcastToUserSessions(String(userId), "dbUpdate", {
                eventType,
                collection: collectionName,
                id: documentId
            });
        }
        else {
            getIoInstance()?.emit('dbUpdate', {
                eventType,
                collection: collectionName,
                id: documentId
            });
        }
    });
}