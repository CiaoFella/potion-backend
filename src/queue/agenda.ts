import Agenda, { Job, JobAttributesData } from 'agenda'

const mongoConnectionString = process.env.MONGODB_URI;
export const agenda = new Agenda({ db: { address: mongoConnectionString } });

