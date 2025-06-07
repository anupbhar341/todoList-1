import express from "express";

import { register } from "../controller/user.controller.js";
import { login } from "../controller/user.controller.js";
import { logout } from "../controller/user.controller.js";
import { getProfile } from "../controller/user.controller.js";
import { verifyToken } from "../jwt/token.js";

const router = express.Router();

router.post("/sign-up", register);
router.post("/sign-in", login);
router.get("/logout", logout);
router.get("/profile", verifyToken, getProfile);

  // Example protected route
//   app.get('/protected', verifyToken, (req, res) => {
//     res.json({ message: 'You have access' });
//   });

export default router;
