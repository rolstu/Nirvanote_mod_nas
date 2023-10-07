import {Router} from 'express';
import { getQuestions, taskAssignmentsHandler } from '../handlers/Integration';

export const integrationRouter = Router();

integrationRouter.post('/v1', taskAssignmentsHandler);
integrationRouter.get('/questions', getQuestions);