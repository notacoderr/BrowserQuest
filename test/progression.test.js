"use strict";

var assert = require("node:assert/strict"),
    fs = require("node:fs"),
    os = require("node:os"),
    path = require("node:path"),
    test = require("node:test"),
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "browserquest-progression-"));

process.env.BROWSERQUEST_PROGRESSION_FILE = path.join(tempDirectory, "progression.json");

var Progression = require("../server/js/progression"),
    Types = require("../shared/js/gametypes");

test("kills award XP and advance matching quests", function() {
    Progression._resetForTests();
    var update = Progression.record("Hero", "kill", Types.Entities.RAT);
    var pestControl = update.state.quests.find(function(quest) { return quest.id === "first_blood"; });

    assert.equal(update.state.xp, 20);
    assert.equal(pestControl.progress, 1);
});

test("quest rewards can level a character", function() {
    Progression._resetForTests();
    Progression.record("Hero", "kill", Types.Entities.RAT);
    Progression.record("Hero", "kill", Types.Entities.RAT);
    var update = Progression.record("Hero", "kill", Types.Entities.RAT);

    assert.equal(update.state.level, 2);
    assert.ok(update.events.some(function(event) { return event.type === "quest"; }));
    assert.ok(update.events.some(function(event) { return event.type === "level"; }));
});

test("hunt contracts reset and remain repeatable", function() {
    Progression._resetForTests();
    var update;
    for(var i = 0; i < 5; i += 1) {
        update = Progression.record("Hero", "kill", Types.Entities.GOBLIN);
    }
    var contract = update.state.quests.find(function(quest) { return quest.id === "hunt_contract"; });

    assert.equal(contract.progress, 0);
    assert.equal(contract.cycles, 1);
    assert.equal(contract.completed, false);
});

test.after(function() {
    fs.rmSync(tempDirectory, {recursive: true, force: true});
});
