import serverless from 'serverless-http';
import app from './index'; // Changed from './app' to './index'

export const handler = serverless(app); 