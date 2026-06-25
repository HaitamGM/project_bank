import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, classification_report, roc_curve, auc, f1_score
import joblib
import os

def train_and_evaluate(data_path='data/synthetic_credit_data.csv', output_dir='docs/metrics'):
    print(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)

    # Features (X) and Target (y)
    # Note: We drop 'score' because that's the internal calculation we are trying to predict around
    X = df.drop(['score', 'approved'], axis=1)
    y = df['approved']

    print("Splitting data into train and test sets (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    # Save the model
    model_path = os.path.join(output_dir, 'credit_scoring_model.pkl')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

    # Predictions
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    print("\n--- Model Evaluation ---")
    print(classification_report(y_test, y_pred))
    print(f"F1 Score: {f1_score(y_test, y_pred):.4f}")

    # 1. Plot Confusion Matrix
    print("Generating Confusion Matrix plot...")
    plt.figure(figsize=(8, 6))
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Refusé', 'Approuvé'],
                yticklabels=['Refusé', 'Approuvé'])
    plt.title('Matrice de Confusion - Modèle de Scoring')
    plt.ylabel('Valeur Réelle (Ground Truth)')
    plt.xlabel('Prédiction du Modèle')
    cm_path = os.path.join(output_dir, 'confusion_matrix.png')
    plt.savefig(cm_path)
    plt.close()

    # 2. Plot ROC Curve
    print("Generating ROC-AUC Curve plot...")
    plt.figure(figsize=(8, 6))
    fpr, tpr, thresholds = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)

    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'Courbe ROC (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('Taux de Faux Positifs (FPR)')
    plt.ylabel('Taux de Vrais Positifs (TPR)')
    plt.title('Caractéristique de Fonctionnement du Récepteur (ROC)')
    plt.legend(loc="lower right")
    roc_path = os.path.join(output_dir, 'roc_curve.png')
    plt.savefig(roc_path)
    plt.close()

    # 3. Plot Feature Importance
    print("Generating Feature Importance plot...")
    plt.figure(figsize=(10, 6))
    feature_imp = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False)
    sns.barplot(x=feature_imp, y=feature_imp.index)
    plt.title('Importance des Variables (Feature Importance)')
    plt.xlabel('Score d\'importance')
    plt.ylabel('Variables')
    feat_path = os.path.join(output_dir, 'feature_importance.png')
    plt.savefig(feat_path)
    plt.close()

    print(f"\nAll plots saved successfully to {output_dir}/")

if __name__ == '__main__':
    train_and_evaluate()
