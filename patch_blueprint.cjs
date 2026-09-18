const fs = require('fs');
let code = fs.readFileSync('firebase-blueprint.json', 'utf-8');

code = code.replace(
  `    "HubConfig": {`,
  `    "Rating": {
      "title": "Rating",
      "description": "User feedback rating",
      "type": "object",
      "properties": {
        "stars": { "type": "number" },
        "feedback": { "type": "string" },
        "createdAt": { "type": "string" }
      },
      "required": ["stars"]
    },
    "HubConfig": {`
);

code = code.replace(
  `    "/config/hub": {
      "schema": { "$ref": "#/entities/HubConfig" },
      "description": "Stores hub configuration"
    }`,
  `    "/config/hub": {
      "schema": { "$ref": "#/entities/HubConfig" },
      "description": "Stores hub configuration"
    },
    "/ratings/{ratingId}": {
      "schema": { "$ref": "#/entities/Rating" },
      "description": "Stores user ratings"
    }`
);

fs.writeFileSync('firebase-blueprint.json', code);
