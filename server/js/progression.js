"use strict";

var fs = require("fs"),
    path = require("path"),
    Types = require("../../shared/js/gametypes"),
    dataDirectory = path.join(__dirname, "..", "data"),
    dataFile = process.env.BROWSERQUEST_PROGRESSION_FILE || path.join(dataDirectory, "progression.json"),
    records = loadRecords();

var QUESTS = [
    {id: "first_blood", title: "Pest Control", description: "Defeat 3 rats", event: "kill", kind: Types.Entities.RAT, target: 3, reward: 75},
    {id: "bone_collector", title: "Bone Collector", description: "Defeat 5 skeletons", event: "kill", kinds: [Types.Entities.SKELETON, Types.Entities.SKELETON2], target: 5, reward: 150},
    {id: "field_supplier", title: "Field Supplier", description: "Collect 5 items", event: "loot", target: 5, reward: 100},
    {id: "hunt_contract", title: "Hunt Contract", description: "Defeat 5 creatures", event: "kill", target: 5, reward: 100, repeatable: true}
];

function defaultRecord() {
    return {level: 1, xp: 0, totalXp: 0, quests: {}};
}

function loadRecords() {
    try {
        return JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch(error) {
        if(error.code !== "ENOENT") {
            console.error("Could not read progression data:", error.message);
        }
        return {};
    }
}

function saveRecords() {
    fs.mkdirSync(dataDirectory, {recursive: true});
    fs.writeFileSync(dataFile + ".tmp", JSON.stringify(records, null, 2));
    fs.renameSync(dataFile + ".tmp", dataFile);
}

function keyFor(name) {
    return String(name).trim().toLocaleLowerCase();
}

function xpToNext(level) {
    return 100 + ((level - 1) * 50);
}

function getQuestState(record, definition) {
    if(!record.quests[definition.id]) {
        record.quests[definition.id] = {progress: 0, completed: false, cycles: 0};
    }
    return record.quests[definition.id];
}

function addXp(record, amount, events) {
    record.xp += amount;
    record.totalXp += amount;
    events.push({type: "xp", amount: amount});

    while(record.xp >= xpToNext(record.level)) {
        record.xp -= xpToNext(record.level);
        record.level += 1;
        events.push({type: "level", level: record.level});
    }
}

function snapshot(record) {
    return {
        level: record.level,
        xp: record.xp,
        xpToNext: xpToNext(record.level),
        totalXp: record.totalXp,
        quests: QUESTS.map(function(definition) {
            var state = getQuestState(record, definition);
            return {
                id: definition.id,
                title: definition.title,
                description: definition.description,
                progress: state.progress,
                target: definition.target,
                reward: definition.reward,
                completed: state.completed,
                repeatable: Boolean(definition.repeatable),
                cycles: state.cycles
            };
        })
    };
}

function matches(definition, event, kind) {
    return definition.event === event &&
        (!definition.kind || definition.kind === kind) &&
        (!definition.kinds || definition.kinds.indexOf(kind) !== -1);
}

exports.load = function(name) {
    var key = keyFor(name);
    if(!records[key]) {
        records[key] = defaultRecord();
        saveRecords();
    }
    return records[key];
};

exports.record = function(name, event, kind) {
    var record = exports.load(name),
        events = [],
        baseXp = event === "kill" ? 20 : 5;

    addXp(record, baseXp, events);
    QUESTS.forEach(function(definition) {
        var state = getQuestState(record, definition);
        if(!matches(definition, event, kind) || (state.completed && !definition.repeatable)) {
            return;
        }

        state.progress += 1;
        if(state.progress >= definition.target) {
            state.cycles += 1;
            events.push({type: "quest", id: definition.id, title: definition.title, reward: definition.reward, cycle: state.cycles});
            addXp(record, definition.reward, events);
            if(definition.repeatable) {
                state.progress = 0;
            } else {
                state.progress = definition.target;
                state.completed = true;
            }
        }
    });

    saveRecords();
    return {state: snapshot(record), events: events};
};

exports.snapshot = snapshot;
exports.xpToNext = xpToNext;
exports._resetForTests = function() { records = {}; };
