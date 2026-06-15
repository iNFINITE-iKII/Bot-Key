import { Router } from "express";
import { isValidKey } from "../lib/keyStore.js";

const checkRouter = Router();

checkRouter.get("/check", async (req, res) => {
  const key = req.query["key"];

  if (typeof key !== "string" || !key) {
    res.json({ status: "error", message: "Key tidak diberikan!" });
    return;
  }

  const valid = await isValidKey(key);
  if (valid) {
    res.json({ status: "success", message: "Akses Diberikan!" });
  } else {
    res.json({ status: "error", message: "Key Tidak Valid atau Kedaluwarsa!" });
  }
});

export default checkRouter;
