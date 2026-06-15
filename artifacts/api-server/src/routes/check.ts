import { Router } from "express";
import { isValidKey } from "../lib/keyStore.js";

const checkRouter = Router();

checkRouter.get("/check", (req, res) => {
  const key = req.query["key"];

  if (typeof key !== "string" || !key) {
    res.json({ status: "error", message: "Key tidak diberikan!" });
    return;
  }

  if (isValidKey(key)) {
    res.json({ status: "success", message: "Akses Diberikan!" });
  } else {
    res.json({ status: "error", message: "Key Tidak Valid atau Kedaluwarsa!" });
  }
});

export default checkRouter;
