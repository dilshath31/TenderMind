import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report
import pickle
import json

class MLResearchPipeline:
    def __init__(self, data_path: str = "data/bidcorpus.csv"):
        self.data_path = data_path
        self.vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        
        self.models = {
            "logistic_regression": LogisticRegression(max_iter=1000),
            "decision_tree": DecisionTreeClassifier(random_state=42),
            "random_forest": RandomForestClassifier(n_estimators=100, random_state=42)
        }
        
    def load_and_preprocess(self):
        """
        Loads the dataset, handles duplicates and empty text,
        and splits into train/val/test (70/15/15).
        Expected columns: 'text', 'label' (Object, Qualification, Accreditation, Judgment, Other)
        """
        if not os.path.exists(self.data_path):
            print(f"Dataset {self.data_path} not found. Please place BidCorpus dataset here.")
            return None, None, None, None
            
        df = pd.read_csv(self.data_path)
        
        # Cleaning
        df = df.dropna(subset=['text', 'label'])
        df = df.drop_duplicates(subset=['text'])
        df['text'] = df['text'].str.strip()
        df = df[df['text'] != '']
        
        X = df['text']
        y = df['label']
        
        # 70% Train, 30% Temp
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
        # Split Temp into 15% Val, 15% Test
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp)
        
        # Vectorize
        X_train_vec = self.vectorizer.fit_transform(X_train)
        X_val_vec = self.vectorizer.transform(X_val)
        X_test_vec = self.vectorizer.transform(X_test)
        
        return (X_train_vec, y_train), (X_val_vec, y_val), (X_test_vec, y_test)
        
    def train_and_evaluate(self):
        train_data, val_data, test_data = self.load_and_preprocess()
        if not train_data:
            return
            
        X_train, y_train = train_data
        X_val, y_val = val_data
        
        results = {}
        
        for name, model in self.models.items():
            print(f"Training {name}...")
            model.fit(X_train, y_train)
            
            y_pred = model.predict(X_val)
            acc = accuracy_score(y_val, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(y_val, y_pred, average='weighted')
            
            results[name] = {
                "accuracy": acc,
                "precision": precision,
                "recall": recall,
                "f1": f1
            }
            
            # Save model
            os.makedirs("ml/models", exist_ok=True)
            with open(f"ml/models/{name}.pkl", "wb") as f:
                pickle.dump(model, f)
                
        # Save vectorizer
        with open("ml/models/vectorizer.pkl", "wb") as f:
            pickle.dump(self.vectorizer, f)
            
        # Save results
        with open("ml/results.json", "w") as f:
            json.dump(results, f, indent=4)
            
        print("Training complete. Results saved.")
        return results

if __name__ == "__main__":
    pipeline = MLResearchPipeline()
    pipeline.train_and_evaluate()
