const log = require('./Logs.js');

module.exports = function (db) {

    function ShuwdownDB() {
        db.pragma('wal_checkpoint(RESTART)'); // Clear the WAL file
        db.pragma('analysis_limit=8000'); // Set the analysis limit to 8000
        db.exec('ANALYZE'); // Analyze database for better query planning and optimization
        db.exec('VACUUM'); // Clear any empty space in the database
        db.close();
    }

    // Crtl + C
    process.on('SIGINT', () => {
        console.log();
        log.error('SIGINT: Exiting...');
        ShuwdownDB();
        process.exit(0);
    });

    // Standard crash
    process.on('uncaughtException', (err) => {
        log.error(`UNCAUGHT EXCEPTION: ${err.stack}`);
    });

    // Killed process
    process.on('SIGTERM', () => {
        log.error('SIGTERM: Exiting...');
        ShutdownDB();
        process.exitt(0);
    });

    // Standard crash
    process.on('unhandledRejection', (err) => {
        log.error(`UNHANDLED REJECTION: ${err.stack}`);
    });

    // Deprecation warnings
    process.on('warning', (warning) => {
        log.warn(`WARNING: ${warning.name} : ${warning.message}`);
    });

    // Reference errors
    process.on('uncaughtReferenceError', (err) => {
        log.error(err.stack);
    });

};
