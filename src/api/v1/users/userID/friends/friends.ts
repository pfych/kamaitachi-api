import * as express from "express";
import db from "../../../../../db";
const router = express.Router({ mergeParams: true });
import userCore from "../../../../../core/user-core";
import middlewares from "../../../../../middlewares";
import apiConfig from "../../../../../apiconfig";

// mounted on /api/v1/users/:userID/friends

router.get("/", async function (req, res) {
    let user = req.requestedUser;

    let friends = await db
        .get("users")
        .find({ id: { $in: user.friends } }, { projection: apiConfig.REMOVE_PRIVATE_USER_RETURNS });

    return res.status(200).json({
        success: true,
        description: `Successfully found friends of user '${req.params.userID}'`,
        body: {
            items: friends,
        },
    });
});

router.get("/online", async function (req, res) {
    let user = req.requestedUser;

    let curTime = Date.now();
    let friends = await db.get("users").find(
        {
            id: { $in: user.friends },
            lastSeen: {
                $gt: curTime - apiConfig.TIME_DELTA_ONLINE,
            },
        },
        { projection: apiConfig.REMOVE_PRIVATE_USER_RETURNS }
    );

    return res.status(200).json({
        success: true,
        description: `Successfully found friends of user '${req.params.userID}'`,
        body: {
            items: friends,
        },
    });
});

router.patch("/add", middlewares.RequireUserKeyMatch, async function (req, res) {
    let friend = await userCore.GetUser(req.body.friendID);

    if (!friend) {
        return res.status(404).json({
            success: false,
            description: `This user ${req.body.friendID} does not exist.`,
        });
    }

    let user = req.user;

    if (user.friends.length > 100) {
        return res.status(400).json({
            success: false,
            description: "You have reached the friend limit.",
        });
    }

    if (user.friends.includes(friend.id)) {
        return res.status(400).json({
            success: false,
            description: "You are already friends with this user.",
        });
    }

    await db.get("users").update({ _id: user._id }, { $push: { friends: friend.id } });

    return res.status(201).json({
        success: true,
        description: `Successfully added ${friend.displayname} as a friend!`,
        body: {
            item: friend,
        },
    });
});

router.patch("/remove", middlewares.RequireUserKeyMatch, async function (req, res) {
    let friend = await userCore.GetUser(req.body.friendID);

    if (!friend) {
        return res.status(404).json({
            success: false,
            description: `This user ${req.body.friendID} does not exist.`,
        });
    }
    let user = req.user;

    if (!user.friends.includes(friend.id)) {
        return res.status(400).json({
            success: false,
            description: `friendID '${req.body.friendID}' is not a friend of userID ${req.params.userID}'s`,
        });
    }

    let newFriends = user.friends.filter((f) => f !== friend.id);

    await db.get("users").update({ _id: user._id }, { $set: { friends: newFriends } });

    return res.status(200).json({
        success: true,
        description: `Successfully removed ${friend.displayname} as a friend.`,
        body: {
            item: friend,
        },
    });
});

export default router;
