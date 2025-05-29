import express, { Express } from "express";
import { productsRouter } from "./controllers/product.controller";
import layouts from "express-ejs-layouts";
import bodyParser from "body-parser";
import { authRouter, validateSession } from "./controllers/auth.controller";
import session from "express-session";

export default function (): Express {
  const app = express();

  app.use(session({
    secret: 'abcde',
    saveUninitialized: false,
    resave: false
  }));

  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.set("view engine", "ejs");
  app.set("views", "Shop.Admin/views");
  app.use(layouts);
  app.use(express.static(__dirname + "/public"));
  app.use(validateSession);

  app.use("/auth", authRouter);
  app.use("/", productsRouter);

  return app;
}

