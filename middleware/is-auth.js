import jwt from 'jsonwebtoken';
const { verify } = jwt;

export default (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) { 
    const err = new Error('Not authenticated!');
    err.statusCode = 401;
    throw err;
  }

  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch(err) {
    throw err;
  }

  if (!decodedToken) {
    const err = new Error('Not authenticated!');
    err.statusCode = 401;
    throw err;
  }

  // Bundle the userId into each request
  req.userId = decodedToken.userId;
  next();
}