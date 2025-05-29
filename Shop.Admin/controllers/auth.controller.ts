import { Router, Request, Response, NextFunction } from "express";
import { throwServerError } from "./helper";
import { IAuthRequisites } from "@Shared/types";
import { verifyRequisites } from "../models/auth.model";

export const authRouter = Router();

authRouter.post("/authenticate", async (
   req: Request<{}, {}, IAuthRequisites>,
   res: Response
) => {
   try {
      const verified = await verifyRequisites(req.body);

      if (verified) {
         if (req.session) { req.session.username = req.body.username;}
        
          res.redirect(`/${process.env.ADMIN_PATH}`)
      } else {
          res.redirect(`/${process.env.ADMIN_PATH}/auth/login`);
      }
   } catch (e) {
       throwServerError(res, e);
   }
});

authRouter.get("/login", async (req: Request, res: Response) => {
   try {
       res.render("login");
   } catch (e) {
       throwServerError(res, e);
   }
});

export const validateSession = (
   req: Request,
   res: Response,
   next: NextFunction
 ) => {
   if (req.path.includes("/login") || req.path.includes("/authenticate")) {
     next();
     return;
   }
 
   if (req) {
     next();
   } else {
     res.redirect(`/${process.env.ADMIN_PATH}/auth/login`);
   }
 }