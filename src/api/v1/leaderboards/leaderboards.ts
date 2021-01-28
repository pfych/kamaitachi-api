const db = require("../../../db.js");
import * as express from "express";
const router = express.Router({ mergeParams: true });
const rgxIsInt = /^[0-9]+$/;
const config = require("../../../config/config.js");
const apiConfig = require("../../../apiconfig.js");

// mounted on /api/v1/leaderboards

const RETURN_LIMIT = 100;

router.get("/", async function (req, res) {
    let leaderboardData = {};

    for (const game of config.supportedGames) {
        leaderboardData[game] = {};

        for (const pt of config.validPlaytypes[game]) {
            let leaderboardInfo = await db.get("users").find(
                {},
                {
                    projection: apiConfig.REMOVE_PRIVATE_USER_RETURNS,
                    sort: { [`ratings.${game}.${pt}`]: -1 },
                    limit: RETURN_LIMIT,
                }
            );

            leaderboardInfo = leaderboardInfo.filter((e) => e.ratings[game] && e.ratings[game][pt] > 0.001);
            leaderboardData[game][pt] = leaderboardInfo;
        }
    }

    return res.status(200).json({
        success: true,
        description: `Found leaderboards for ${config.supportedGames.length} games.`,
        body: leaderboardData,
    });
});

router.get("/games/:game", async function (req, res) {
    let playtype = req.query.playtype ? req.query.playtype : config.defaultPlaytype[req.params.game];

    let sortCriteria = `ratings.${req.params.game}.${playtype}`;

    if (req.query.sortCriteria === "lampRating") {
        sortCriteria = `lampRatings.${req.params.game}.${playtype}`;
    }

    if (req.query.customRatings && req.query.sortCriteria) {
        sortCriteria = `customRatings.${req.params.game}.${playtype}.${req.query.sortCriteria}`;
    }

    let settings = {
        projection: apiConfig.REMOVE_PRIVATE_USER_RETURNS,
        sort: { [sortCriteria]: -1 },
    };

    settings.skip = req.query.start ? parseInt(req.query.start) : 0;
    settings.limit = RETURN_LIMIT;
    if (req.query.limit && !req.query.limit.match(rgxIsInt)) {
        return res.status(400).json({
            success: false,
            description: "Limit is not an integer.",
        });
    }
    if (parseInt(req.query.limit) > settings.limit) {
        return res.status(400).json({
            success: false,
            description: `Limit exceeds ${settings.limit}.`,
        });
    }
    settings.limit = parseInt(req.query.limit);

    let users = await db.get("users").find({}, settings);

    let leaderBody = { items: users };
    if (users.length !== 0) {
        leaderBody.nextStartPoint = settings.skip + settings.limit;
    }

    return res.status(200).json({
        success: true,
        description: "Leaderboards successfully returned",
        body: leaderBody,
    });
});

module.exports = router;