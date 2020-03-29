import express = require("express");

import { Mail } from "./nodemail";
import { MongoDB } from "../MongoDB/mongo";
import { Verify } from "./verify_user";
import { Intermediate } from "./deps";

const User = require("../MongoDB/Schema/users");
const router = express.Router();
const intermediate = new Intermediate();

const mongo = new MongoDB();

let cookies_data: boolean;
let cookies_name: string;
let cookies_password: string;

router.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.cookies.user_data === undefined) {
        cookies_data = false;
    } else {
        cookies_data = true;
        cookies_name = req.cookies.user_data[0]["name"];
        cookies_password = req.cookies.user_data[0]["password"];
    }
    next();
});

router.get("/", async (req: express.Request, res: express.Response) => {
    console.log(intermediate.verify_cookies(req, res));
    if (!cookies_data) res.render("index", { data: { is_login: cookies_data } });
    else {
        await mongo.find_user_mark(cookies_name, cookies_password);
        if (mongo.boolean_value_get()) {
            res.render("index", {
                data: {
                    is_login: cookies_data,
                    name: cookies_name,
                    password: cookies_password
                }
            });
        } else {
            res.clearCookie("user_data");
        }
    }
});

router.get("/login", (req: express.Request, res: express.Response) => {
    if (!cookies_data) res.render("login");
    else res.send("you're logged in already");
});

router.get("/registration", (req: express.Request, res: express.Response) => {
    if (!cookies_data) res.render("registration");
    else res.send("you're logged in");
});

router.post("/exit", (req: express.Request, res: express.Response) => {
    res.clearCookie("user_data");
    res.redirect("/");
});

router.post("/req-page-progress", mongo.paginated_results(User), async (req: express.Request, res: express.Response | any) => {
    const user = await mongo.find_user_mark(req.body.name, req.body.password);

    if (!req.body) return res.sendStatus(400);

    if (mongo.boolean_value_get()) {
        res.cookie("user_data", user);
        res.redirect("/");
    } else {
        res.json(false);
    }
});

router.post("/registration-process", async (req: express.Request, res: express.Response) => {
    const new_user = new Verify(req.body);
    const verify = new_user.verify();

    for (let key in verify) {
        if (verify[key] === false || verify[key] == null) {
            res.json(verify);
            return;
        }
    }

    if (!req.body) return res.sendStatus(400);

    await mongo.find_user_name(req.body.name);
    await mongo.find_email(req.body.email);

    const exists = {
        name: mongo.boolean_value_get(),
        email: mongo.boolean_value_get_email()
    };
    const message = {
        from: "ilyaspiypiy@gmail.com",
        to: req.body.email,
        subject: "Test",
        text: "работает"
    };

    if (mongo.boolean_value_get() || mongo.boolean_value_get_email()) {
        res.json(exists);
        return;
    }

    const mail = new Mail(message);
    mail.send();
    mongo.save_user(req.body.name, req.body.password, req.body.email);
    res.json(exists);
});

export default router;
