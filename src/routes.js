import { Router } from 'express';
import User from './app/models/Usuario';

const routes = new Router();

routes.get('/', async (req, res) => {
  const user = await User.create({
    name: 'Teste',
    email: 'teste@teste.com.br',
    password_hash: '234234',
  });

  return res.json(user);
});

export default routes;
