const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./competition.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// ==================== DATABASE INITIALIZATION ====================

function initializeDatabase() {
    // Create tables
    db.serialize(() => {
        // Teams table
        db.run(`
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_name TEXT UNIQUE NOT NULL,
                access_code TEXT UNIQUE NOT NULL,
                registered INTEGER DEFAULT 0,
                total_score INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Problems table
        db.run(`
            CREATE TABLE IF NOT EXISTS problems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                points INTEGER NOT NULL,
                test_cases TEXT NOT NULL
            )
        `);

        // Submissions table
        db.run(`
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                problem_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                language TEXT NOT NULL,
                status TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                test_results TEXT,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams(id),
                FOREIGN KEY (problem_id) REFERENCES problems(id)
            )
        `);

        // Activity log table
        db.run(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams(id)
            )
        `);

        // Solved problems table
        db.run(`
            CREATE TABLE IF NOT EXISTS solved_problems (
                team_id INTEGER NOT NULL,
                problem_id INTEGER NOT NULL,
                solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (team_id, problem_id),
                FOREIGN KEY (team_id) REFERENCES teams(id),
                FOREIGN KEY (problem_id) REFERENCES problems(id)
            )
        `);

        // Seed problems
        seedProblems();
    });
}

function seedProblems() {
    db.get('SELECT COUNT(*) as count FROM problems', (err, row) => {
        if (err) {
            console.error('Error checking problems:', err);
            return;
        }

        if (row.count === 0) {
            const problems = [
                {
                    title: 'Two Sum',
                    difficulty: 'Easy',
                    points: 100,
                    testCases: JSON.stringify([
                        { input: { nums: [2, 7, 11, 15], target: 9 }, output: [0, 1] },
                        { input: { nums: [3, 2, 4], target: 6 }, output: [1, 2] },
                        { input: { nums: [3, 3], target: 6 }, output: [0, 1] },
                        { input: { nums: [1, 5, 3, 7, 9], target: 12 }, output: [2, 4] },
                        { input: { nums: [0, 4, 3, 0], target: 0 }, output: [0, 3] }
                    ])
                },
                {
                    title: 'Valid Parentheses',
                    difficulty: 'Easy',
                    points: 100,
                    testCases: JSON.stringify([
                        { input: '()', output: true },
                        { input: '()[]{}', output: true },
                        { input: '(]', output: false },
                        { input: '([)]', output: false },
                        { input: '{[]}', output: true }
                    ])
                },
                {
                    title: 'Binary Search',
                    difficulty: 'Medium',
                    points: 200,
                    testCases: JSON.stringify([
                        { input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, output: 4 },
                        { input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, output: -1 },
                        { input: { nums: [5], target: 5 }, output: 0 },
                        { input: { nums: [1, 3, 5, 7, 9, 11], target: 7 }, output: 3 },
                        { input: { nums: [2, 4, 6, 8, 10], target: 1 }, output: -1 }
                    ])
                },
                {
                    title: 'Coin Change',
                    difficulty: 'Medium',
                    points: 200,
                    testCases: JSON.stringify([
                        { input: { coins: [1, 2, 5], amount: 11 }, output: 3 },
                        { input: { coins: [2], amount: 3 }, output: -1 },
                        { input: { coins: [1], amount: 0 }, output: 0 },
                        { input: { coins: [1, 3, 4], amount: 6 }, output: 2 },
                        { input: { coins: [2, 5, 10], amount: 27 }, output: 4 }
                    ])
                },
                {
                    title: 'Merge Intervals',
                    difficulty: 'Medium',
                    points: 200,
                    testCases: JSON.stringify([
                        { input: [[1, 3], [2, 6], [8, 10], [15, 18]], output: [[1, 6], [8, 10], [15, 18]] },
                        { input: [[1, 4], [4, 5]], output: [[1, 5]] },
                        { input: [[1, 4], [0, 4]], output: [[0, 4]] },
                        { input: [[1, 3]], output: [[1, 3]] },
                        { input: [[1, 4], [2, 3]], output: [[1, 4]] }
                    ])
                },
                {
                    title: 'Word Ladder',
                    difficulty: 'Hard',
                    points: 350,
                    testCases: JSON.stringify([
                        { input: { beginWord: 'hit', endWord: 'cog', wordList: ['hot', 'dot', 'dog', 'lot', 'log', 'cog'] }, output: 5 },
                        { input: { beginWord: 'hit', endWord: 'cog', wordList: ['hot', 'dot', 'dog', 'lot', 'log'] }, output: 0 },
                        { input: { beginWord: 'a', endWord: 'c', wordList: ['a', 'b', 'c'] }, output: 2 }
                    ])
                },
                {
                    title: 'Longest Increasing Path in Matrix',
                    difficulty: 'Hard',
                    points: 350,
                    testCases: JSON.stringify([
                        { input: [[9, 9, 4], [6, 6, 8], [2, 1, 1]], output: 4 },
                        { input: [[3, 4, 5], [3, 2, 6], [2, 2, 1]], output: 4 },
                        { input: [[1]], output: 1 }
                    ])
                }
            ];

            const stmt = db.prepare('INSERT INTO problems (title, difficulty, points, test_cases) VALUES (?, ?, ?, ?)');
            problems.forEach(p => {
                stmt.run(p.title, p.difficulty, p.points, p.testCases);
            });
            stmt.finalize();

            console.log('Problems seeded successfully!');
        }
    });
}

// ==================== HELPER FUNCTIONS ====================

function logActivity(teamId, action, details = '') {
    db.run(
        'INSERT INTO activity_log (team_id, action, details) VALUES (?, ?, ?)',
        [teamId, action, details]
    );
}

// ==================== ADMIN ENDPOINTS ====================

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    const ADMIN_PASSWORD = 'admin123'; // CHANGE THIS!

    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

app.get('/admin/teams', (req, res) => {
    db.all(
        'SELECT id, team_name, access_code, registered, total_score, created_at FROM teams ORDER BY created_at DESC',
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const teams = rows.map(row => ({
                id: row.id,
                teamName: row.team_name,
                accessCode: row.access_code,
                registered: Boolean(row.registered),
                totalScore: row.total_score,
                createdAt: row.created_at
            }));

            res.json(teams);
        }
    );
});

app.post('/admin/teams/create', (req, res) => {
    const { teamName } = req.body;

    if (!teamName) {
        res.status(400).json({ success: false, message: 'Team name is required' });
        return;
    }

    // Generate unique access code
    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    db.run(
        'INSERT INTO teams (team_name, access_code, registered) VALUES (?, ?, 0)',
        [teamName, accessCode],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    res.status(400).json({ success: false, message: 'Team name already exists' });
                } else {
                    res.status(500).json({ success: false, message: err.message });
                }
                return;
            }

            res.json({
                success: true,
                team: {
                    id: this.lastID,
                    teamName: teamName,
                    accessCode: accessCode,
                    registered: false
                }
            });
        }
    );
});

app.delete('/admin/teams/:id', (req, res) => {
    const teamId = req.params.id;

    db.run('DELETE FROM teams WHERE id = ?', [teamId], (err) => {
        if (err) {
            res.status(500).json({ success: false, message: err.message });
            return;
        }
        res.json({ success: true });
    });
});

app.get('/admin/leaderboard', (req, res) => {
    db.all(`
        SELECT 
            t.id,
            t.team_name,
            t.total_score,
            COUNT(DISTINCT sp.problem_id) as problems_solved,
            MAX(s.submitted_at) as last_submission
        FROM teams t
        LEFT JOIN solved_problems sp ON t.id = sp.team_id
        LEFT JOIN submissions s ON t.id = s.team_id
        WHERE t.registered = 1
        GROUP BY t.id, t.team_name, t.total_score
        ORDER BY t.total_score DESC, problems_solved DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const leaderboard = rows.map(row => ({
            teamName: row.team_name,
            score: row.total_score,
            solved: row.problems_solved,
            lastSubmit: row.last_submission || 'No submissions'
        }));

        res.json(leaderboard);
    });
});

app.get('/admin/activities', (req, res) => {
    db.all(`
        SELECT 
            t.team_name,
            a.action,
            a.details,
            a.timestamp
        FROM activity_log a
        JOIN teams t ON a.team_id = t.id
        ORDER BY a.timestamp DESC
        LIMIT 50
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const activities = rows.map(row => ({
            team: row.team_name,
            action: row.action,
            details: row.details,
            timestamp: row.timestamp
        }));

        res.json(activities);
    });
});

app.get('/admin/stats', (req, res) => {
    db.get('SELECT COUNT(*) as total FROM teams', (err, totalRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        db.get('SELECT COUNT(*) as registered FROM teams WHERE registered = 1', (err, regRow) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            db.get('SELECT COUNT(*) as submissions FROM submissions', (err, subRow) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                db.get(`SELECT COUNT(*) as active FROM submissions 
                        WHERE datetime(submitted_at) > datetime('now', '-5 minutes')`, 
                (err, activeRow) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    res.json({
                        totalTeams: totalRow.total,
                        registeredTeams: regRow.registered,
                        activeTeams: activeRow.active,
                        totalSubmissions: subRow.submissions
                    });
                });
            });
        });
    });
});

// ==================== TEAM ENDPOINTS ====================

app.post('/team/login', (req, res) => {
    const { teamName, accessCode } = req.body;

    if (!teamName || !accessCode) {
        res.status(400).json({ success: false, message: 'Team name and access code are required' });
        return;
    }

    db.get(
        'SELECT id, team_name, registered FROM teams WHERE team_name = ? AND access_code = ?',
        [teamName, accessCode],
        (err, row) => {
            if (err) {
                res.status(500).json({ success: false, message: err.message });
                return;
            }

            if (!row) {
                res.status(401).json({ success: false, message: 'Invalid team name or access code' });
                return;
            }

            // Mark team as registered if first login
            if (!row.registered) {
                db.run('UPDATE teams SET registered = 1 WHERE id = ?', [row.id]);
                logActivity(row.id, 'registered', 'Team registered for competition');
            }

            logActivity(row.id, 'logged in', 'Team logged into the platform');

            res.json({
                success: true,
                team: {
                    id: row.id,
                    teamName: row.team_name
                }
            });
        }
    );
});

app.get('/problems', (req, res) => {
    db.all('SELECT id, title, difficulty, points FROM problems', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const problems = rows.map(row => ({
            id: row.id,
            title: row.title,
            difficulty: row.difficulty,
            points: row.points
        }));

        res.json(problems);
    });
});

app.get('/problems/:id', (req, res) => {
    const problemId = req.params.id;

    db.get('SELECT id, title, difficulty, points, test_cases FROM problems WHERE id = ?', 
    [problemId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Problem not found' });
            return;
        }

        const testCases = JSON.parse(row.test_cases);

        res.json({
            id: row.id,
            title: row.title,
            difficulty: row.difficulty,
            points: row.points,
            testCases: testCases.slice(0, 2) // Only show first 2 test cases
        });
    });
});

app.post('/submit', (req, res) => {
    const { teamId, problemId, code, language } = req.body;

    if (!teamId || !problemId || !code) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
    }

    // Get problem details
    db.get('SELECT title, points, test_cases FROM problems WHERE id = ?', [problemId], (err, problem) => {
        if (err || !problem) {
            res.status(404).json({ success: false, message: 'Problem not found' });
            return;
        }

        const testCases = JSON.parse(problem.test_cases);

        // Execute code against test cases (mock evaluation for Node.js version)
        const result = executeCode(code, language, testCases, problem.title);

        // Save submission
        db.run(
            'INSERT INTO submissions (team_id, problem_id, code, language, status, score, test_results) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [teamId, problemId, code, language, result.status, result.score, JSON.stringify(result.test_results)],
            function(err) {
                if (err) {
                    res.status(500).json({ success: false, message: err.message });
                    return;
                }

                // If all tests passed and not solved before
                if (result.all_passed) {
                    db.get('SELECT 1 FROM solved_problems WHERE team_id = ? AND problem_id = ?', 
                    [teamId, problemId], (err, exists) => {
                        if (!exists) {
                            // First time solving
                            db.run('INSERT INTO solved_problems (team_id, problem_id) VALUES (?, ?)', 
                            [teamId, problemId]);

                            db.run('UPDATE teams SET total_score = total_score + ? WHERE id = ?', 
                            [problem.points, teamId]);

                            logActivity(teamId, 'solved problem', `${problem.title} (+${problem.points} points)`);
                        } else {
                            logActivity(teamId, 'resubmitted', `${problem.title} (already solved)`);
                        }

                        res.json(result);
                    });
                } else {
                    logActivity(teamId, 'failed submission', problem.title);
                    res.json(result);
                }
            }
        );
    });
});

app.get('/team/:id/progress', (req, res) => {
    const teamId = req.params.id;

    db.get(`
        SELECT t.team_name, t.total_score, COUNT(DISTINCT sp.problem_id) as problems_solved
        FROM teams t
        LEFT JOIN solved_problems sp ON t.id = sp.team_id
        WHERE t.id = ?
        GROUP BY t.id
    `, [teamId], (err, team) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        db.all('SELECT problem_id FROM solved_problems WHERE team_id = ?', [teamId], (err, solved) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            res.json({
                teamName: team ? team.team_name : '',
                totalScore: team ? team.total_score : 0,
                problemsSolved: team ? team.problems_solved : 0,
                solvedProblemIds: solved.map(s => s.problem_id)
            });
        });
    });
});

// ==================== CODE EXECUTION (Mock) ====================

function executeCode(code, language, testCases, problemTitle) {
    // NOTE: This is MOCK evaluation for Node.js
    // For real code execution, you'd need to use sandboxed environments
    // or Docker containers

    if (language !== 'python') {
        return {
            success: false,
            status: 'error',
            message: 'Only Python is currently supported for auto-grading',
            score: 0,
            all_passed: false,
            test_results: []
        };
    }

    // Simple mock evaluation
    const hasReturn = code.includes('return');
    const hasLogic = code.length > 50;

    if (!hasReturn || !hasLogic) {
        return {
            success: false,
            status: 'error',
            message: 'Code appears incomplete',
            score: 0,
            total_tests: testCases.length,
            all_passed: false,
            test_results: []
        };
    }

    // Simulate passing tests (70% success rate for demo)
    const passRate = Math.random();
    const passedCount = passRate > 0.3 ? testCases.length : Math.floor(Math.random() * testCases.length);

    const testResults = testCases.map((tc, i) => ({
        test_num: i + 1,
        passed: i < passedCount,
        input: tc.input,
        expected: tc.output,
        actual: i < passedCount ? tc.output : 'incorrect'
    }));

    const allPassed = passedCount === testCases.length;

    return {
        success: allPassed,
        status: allPassed ? 'accepted' : 'wrong_answer',
        score: passedCount,
        total_tests: testCases.length,
        all_passed: allPassed,
        test_results: testResults
    };
}

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📊 Database initialized`);
    console.log(`✅ Ready to accept requests!`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});
