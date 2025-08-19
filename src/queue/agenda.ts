import Agenda, { Job, JobAttributesData } from 'agenda'
import { predictCategory, Transaction } from '../models/Transaction';

const mongoConnectionString = process.env.MONGODB_URI;
export const agenda = new Agenda({ db: { address: mongoConnectionString } });

agenda.define(
    "predict category",
    { concurrency: 5, priority: 10 },
    async (job, done) => {
        try {
            const transaction = (job.attrs.data as any).transaction;
            await predictCategory(transaction);
            done();
        } catch (error) {
            job.fail(error).save();
            done();
        }
    }
)

agenda.define(
    "add Transaction",
    { concurrency: 50, priority: 20 },
    async (job, done) => {
        try {
            const transaction = (job.attrs.data as any).transaction;
            const newTransaction = await Transaction.create(transaction);
            if (!newTransaction?._id) {
                job.fail("error").save();
                done();
            }
            agenda.create('predict category', { transaction: newTransaction }).save();
            done();
        } catch (error) {
            job.fail(error).save();
            done();
        }
    }
)