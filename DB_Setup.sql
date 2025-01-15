CREATE TABLE IF NOT EXISTS infraction_types (
	type TEXT NOT NULL PRIMARY KEY,
	emoji TEXT NOT NULL UNIQUE
);
INSERT OR IGNORE INTO infraction_types VALUES ('warn', '⚠️');
INSERT OR IGNORE INTO infraction_types VALUES ('mute', '🔇');
INSERT OR IGNORE INTO infraction_types VALUES ('unmute', '🔊');
INSERT OR IGNORE INTO infraction_types VALUES ('kick', '👢');
INSERT OR IGNORE INTO infraction_types VALUES ('ban', '🔨');
INSERT OR IGNORE INTO infraction_types VALUES ('unban', '🔓');
INSERT OR IGNORE INTO infraction_types VALUES ('note', '📝');
INSERT OR IGNORE INTO infraction_types VALUES ('clear', '🗑️');

CREATE TABLE IF NOT EXISTS infractions (
	infractionID INTEGER PRIMARY KEY AUTOINCREMENT,
	userID TEXT NOT NULL,
	modID TEXT NOT NULL,
	type TEXT NOT NULL,
	reason TEXT NOT NULL,
	can_appeal BOOLEAN NOT NULL DEFAULT 1,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (type) REFERENCES infraction_types(type)
);
CREATE INDEX IF NOT EXISTS idx_infractions_userID ON infractions (userID);
CREATE INDEX IF NOT EXISTS idx_infractions_modID ON infractions (modID);
CREATE INDEX IF NOT EXISTS idx_infractions_type ON infractions (type);
CREATE INDEX IF NOT EXISTS idx_infractions_created_at ON infractions (created_at);

CREATE TABLE IF NOT EXISTS infraction_appeals (
	appealID INTEGER PRIMARY KEY AUTOINCREMENT,
	infractionID INTEGER NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending',
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	expires_at DATETIME AS (datetime(created_at, '+7 days')),
	FOREIGN KEY (infractionID) REFERENCES infractions(infractionID) ON DELETE CASCADE,
	CHECK (status IN ('pending', 'approved', 'denied'))
);

CREATE TABLE IF NOT EXISTS appeal_questions (
	questionID INTEGER PRIMARY KEY AUTOINCREMENT,
	question TEXT NOT NULL UNIQUE
	-- CHECK (LENGTH(question) <= 128 AND LENGTH(question) > 0)
);
CREATE TRIGGER IF NOT EXISTS trigger_appeal_questions_insert BEFORE INSERT ON appeal_questions
BEGIN
	SELECT RAISE(FAIL, 'Questions must be less than 128 characters and not empty') WHERE LENGTH(NEW.question) > 128 OR LENGTH(NEW.question) = 0;
END;
-- INSERT OR IGNORE INTO appeal_questions (question) VALUES ('What is your side of the story?');
-- INSERT OR IGNORE INTO appeal_questions (question) VALUES ('What will you do to prevent this from happening again?');
-- INSERT OR IGNORE INTO appeal_questions (question) VALUES ('Is there anything else you would like to add?');

CREATE TABLE IF NOT EXISTS appeal_answers (
	appealID INTEGER NOT NULL,
	questionID INTEGER NOT NULL,
	answer TEXT NOT NULL,
	FOREIGN KEY (appealID) REFERENCES infraction_appeals(appealID) ON DELETE CASCADE,
	FOREIGN KEY (questionID) REFERENCES appeal_questions(questionID) ON DELETE CASCADE,
	PRIMARY KEY (appealID, questionID)
);
CREATE INDEX IF NOT EXISTS idx_appeal_answers_appealID ON appeal_answers (appealID);
CREATE INDEX IF NOT EXISTS idx_appeal_answers_questionID ON appeal_answers (questionID);
