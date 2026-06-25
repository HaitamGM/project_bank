import csv
import random
import sys
import os

# Ensure backend can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.scoring import score_credit

def generate_synthetic_data(num_records=10000, output_file='data/synthetic_credit_data.csv'):
    print(f"Generating {num_records} records of synthetic banking data...")

    headers = [
        'revenuMensuel', 'montant', 'dureeMois', 'autresCharges',
        'ancienneteMois', 'incidentsPaiement', 'fichageBam',
        'score', 'approved'
    ]

    with open(output_file, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(headers)

        for _ in range(num_records):
            # Generate realistic distribution of Moroccan banking profiles
            revenu = round(random.triangular(4000, 35000, 8000), 2)
            montant = round(random.triangular(10000, 1000000, 100000), 2)
            duree = random.choice([12, 24, 36, 48, 60, 120, 240])

            # 70% have no other charges, 30% have some
            charges = round(random.uniform(500, 3000), 2) if random.random() < 0.3 else 0

            anciennete = random.randint(1, 120)

            # Incidents: most people have 0, some have 1-3
            incidents_probs = [0.8, 0.1, 0.05, 0.05]
            incidents = random.choices([0, 1, 2, 3], weights=incidents_probs)[0]

            # Fichage BAM: very rare, about 5%
            fichage = True if random.random() < 0.05 else False

            # Calculate actual ground truth using our expert system logic
            result = score_credit(
                revenuMensuel=revenu,
                montant=montant,
                dureeMois=duree,
                autresCharges=charges,
                ancienneteMois=anciennete,
                incidentsPaiement=incidents,
                fichageBam=fichage
            )

            # Append row
            writer.writerow([
                revenu, montant, duree, charges, anciennete,
                incidents, int(fichage), result['score'],
                1 if result['decision'] == 'approuve' else 0
            ])

    print(f"Data generation complete. Saved to {output_file}")

if __name__ == '__main__':
    generate_synthetic_data()
