import Agenda, { Job, JobAttributesData } from 'agenda'
import { predictCategory, Transaction } from '../models/Transaction';

const mongoConnectionString = process.env.MONGODB_URI;
export const agenda = new Agenda({ db: { address: mongoConnectionString } });

agenda.define(
    "add Transaction",
    { concurrency: 10, priority: 10 },
    async (job, done) => {
        try {
            const transaction = (job.attrs.data as any).transaction;
            const newTransaction = await Transaction.create(transaction);
            await predictCategory(newTransaction);
            done();
        } catch (error) {
            job.fail(error).save();
            done();
        }
    }
)