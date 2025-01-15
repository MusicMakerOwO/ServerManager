'use strict';
const fs = require('node:fs');
const path = require('node:path');

const db = require('better-sqlite3')(`${__dirname}/../serverManager.sqlite`);

function ParseQueries(fileContent) {
	const queries = [];
	let buffer = '';
	let inMultilineComment = false;
	let insubQuery = false;

	const lines = fileContent.split('\n');
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i].trim();

		if (line.startsWith('--')) continue;

		if (line.startsWith('/*')) {
			inMultilineComment = true;
		}

		if (inMultilineComment) {
			if (line.endsWith('*/')) {
				inMultilineComment = false;
			}
			continue;
		}

		if (line.includes('BEGIN')) {
			insubQuery = true;
		}

		if (line.includes('END')) {
			insubQuery = false;
		}

		buffer += line + '\n';

		if (line.endsWith(';') && !insubQuery) {
			queries.push(buffer.trim());
			buffer = '';
		} else {
			buffer += ' ';
		}
	}

	// Check if there's any remaining content in the buffer (for cases where the file might not end with a semicolon)
	if (buffer.trim()) {
		queries.push(buffer.trim());
	}

	return queries;
}

module.exports = function SetupDB() {
	const DB_SETUP_FILE = `${__dirname}/../DB_Setup.sql`;
	const fileContent = fs.readFileSync(DB_SETUP_FILE, 'utf-8');
	const DB_SETUP_QUERIES = ParseQueries(fileContent);

	db.exec('BEGIN');

	for (const query of DB_SETUP_QUERIES) {
		try {
			db.exec(query);
		} catch (error) {
			db.exec('ROLLBACK');
			db.close();
			console.error(query);
			console.log(error);
			process.exit(1);
		}
	}
	
	db.exec('COMMIT');

	console.log(`Loaded ${DB_SETUP_QUERIES.length} queries from ${path.resolve(DB_SETUP_FILE)}`);

}
