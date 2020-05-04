const db = require("../../../../../../db.js");
const express = require("express");
const router = express.Router({mergeParams: true});
const middlewares = require("../../../../../../middlewares.js");
const dbHelpers = require("../../../../../../helpers/dbhelpers.js");

// mounted on /api/v1/games/:game/songs/:songID

router.use(middlewares.RequireExistingSongID);

router.get("/", async function(req,res){
    let song = await db.get("songs-" + req.params.game).findOne({id: parseInt(req.params.songID)}, {fields: {_id: 0}});
    if (!song){
        return res.status(500).json({
            success: false,
            description: "Server Error, Song has been removed from the database while processing."
        });
    }
    return res.status(200).json({
        success: true,
        description: "Found song " + song.title + ".",
        body: {
            item: song
        }
    });
});

const CHART_RET_LIMIT = 100;

router.get("/charts", async function(req,res){

    req.query.id = req.params.songID;
    let dbRes = await dbHelpers.FancyDBQuery(
        "charts-" + req.params.game,
        req.query,
        true,
        CHART_RET_LIMIT,
        "charts"
    );

    return res.status(dbRes.statusCode).json(dbRes.body);
});

module.exports = router;