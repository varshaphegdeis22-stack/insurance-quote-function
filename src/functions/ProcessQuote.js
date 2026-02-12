const { app } = require('@azure/functions');

// ---------------- BUSINESS LOGIC ----------------

function vehicleDepreciationFactor(vehicleValue) {
    if (vehicleValue < 300000) return 0.9;
    if (vehicleValue < 700000) return 1.0;
    if (vehicleValue < 1500000) return 1.2;
    return 1.4;
}

function ageRiskFactor(age) {
    if (age < 23) return 1.7;
    if (age < 30) return 1.4;
    if (age < 45) return 1.1;
    if (age < 60) return 1.0;
    return 1.3;
}

function accidentRiskFactor(accidents) {
    return 1 + accidents * 0.35;
}

function vehicleTypeFactor(vehicleType) {
    return {
        Car: 1.0,
        Bike: 1.3,
        SUV: 1.25,
        Truck: 1.7
    }[vehicleType] || 1.0;
}

function drivingBehaviorPenalty(accidents, age) {
    if (accidents >= 3) return 1.4;
    if (accidents === 2) return 1.25;
    if (accidents === 1) return 1.1;
    if (age < 25) return 1.15;
    return 1.0;
}

function calculateRiskScore(age, accidents, vehicleValue, vehicleType) {
    let score = 0;

    if (age < 25) score += 25;
    else if (age < 40) score += 15;
    else if (age > 60) score += 20;
    else score += 10;

    score += accidents * 20;

    if (vehicleValue > 1500000) score += 25;
    else if (vehicleValue > 700000) score += 15;
    else if (vehicleValue > 300000) score += 10;
    else score += 5;

    const typeScores = { Car: 10, Bike: 18, SUV: 15, Truck: 25 };
    score += typeScores[vehicleType] || 10;

    return score;
}

function mapRiskLevel(score) {
    if (score < 40) return "Low";
    if (score < 75) return "Moderate";
    if (score < 110) return "High";
    return "Very High";
}

function calculatePremium(age, accidents, vehicleType, vehicleValue) {
    const baseRate = 0.025;

    const rawPremium = vehicleValue * baseRate;

    const adjusted =
        rawPremium *
        ageRiskFactor(age) *
        accidentRiskFactor(accidents) *
        vehicleTypeFactor(vehicleType) *
        vehicleDepreciationFactor(vehicleValue) *
        drivingBehaviorPenalty(accidents, age);

    const tax = adjusted * 0.18;
    const finalPremium = adjusted + tax;

    return Math.round(finalPremium);
}

function generateReasoning(age, accidents, vehicleType, vehicleValue, riskScore, riskLevel) {
    let r = [];

    if (age < 25) r.push("Young driver increases statistical risk.");
    else if (age > 60) r.push("Senior driver slightly increases reaction risk.");
    else r.push("Driver age is moderate risk.");

    if (accidents === 0) r.push("Clean accident history lowers risk.");
    else r.push(`Accident history (${accidents}) increases risk.`);

    r.push(`Vehicle ${vehicleType} worth ₹${vehicleValue.toLocaleString()} impacts exposure.`);
    r.push(`Risk score ${riskScore} places customer in ${riskLevel} category.`);

    return r.join(" ");
}

// ---------------- AZURE FUNCTION ----------------

app.http('ProcessQuote', {
    methods: ['GET','POST'],
    authLevel: 'anonymous',
    route: 'processquote',
    handler: async (request, context) => {

        let body;
        try {
            body = await request.json();
        } catch {
            return { status: 400, jsonBody: { message: "Invalid JSON body" } };
        }

        const age = Number(body.age);
        const accidents = Number(body.accidents || 0);
        const vehicleType = body.vehicleType || "Car";
        const vehicleValue = Number(body.vehicleValue || 500000);

        if (!age || !vehicleType) {
            return { status: 400, jsonBody: { message: "Missing required fields" } };
        }

        const riskScore = calculateRiskScore(age, accidents, vehicleValue, vehicleType);
        const riskLevel = mapRiskLevel(riskScore);
        const premium = calculatePremium(age, accidents, vehicleType, vehicleValue);
        const reasoning = generateReasoning(age, accidents, vehicleType, vehicleValue, riskScore, riskLevel);

        return {
            status: 200,
            jsonBody: {
                message: "Advanced AI Insurance Engine Running 🚀 - DEMO WORKING",
                riskScore,
                riskLevel, 
                estimatedPremium: premium,
                aiExplanation: reasoning
            }
        };
    }
});
