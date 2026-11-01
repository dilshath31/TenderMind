"""
DistilBERT Fine-tuning Pipeline
Requires GPU/CUDA for practical training, but can run on CPU for testing.
"""
import os
import torch
import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from sklearn.model_selection import train_test_split
from datasets import Dataset

class DistilBertPipeline:
    def __init__(self, data_path: str = "data/bidcorpus.csv"):
        self.data_path = data_path
        self.model_name = "distilbert-base-uncased"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        
    def prepare_data(self):
        if not os.path.exists(self.data_path):
            print(f"Dataset {self.data_path} not found.")
            return None
            
        df = pd.read_csv(self.data_path)
        df = df.dropna(subset=['text', 'label']).drop_duplicates(subset=['text'])
        
        # Encode labels
        labels = df['label'].unique().tolist()
        self.label2id = {l: i for i, l in enumerate(labels)}
        self.id2label = {i: l for i, l in enumerate(labels)}
        df['label'] = df['label'].map(self.label2id)
        
        X_train, X_test, y_train, y_test = train_test_split(df['text'], df['label'], test_size=0.2, random_state=42)
        
        train_dataset = Dataset.from_dict({'text': X_train.tolist(), 'label': y_train.tolist()})
        test_dataset = Dataset.from_dict({'text': X_test.tolist(), 'label': y_test.tolist()})
        
        def tokenize(batch):
            return self.tokenizer(batch['text'], padding=True, truncation=True, max_length=256)
            
        train_dataset = train_dataset.map(tokenize, batched=True)
        test_dataset = test_dataset.map(tokenize, batched=True)
        
        return train_dataset, test_dataset
        
    def train(self):
        datasets = self.prepare_data()
        if not datasets:
            return
            
        train_dataset, test_dataset = datasets
        
        model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name, 
            num_labels=len(self.label2id),
            id2label=self.id2label,
            label2id=self.label2id
        )
        
        training_args = TrainingArguments(
            output_dir="./ml/distilbert_results",
            learning_rate=2e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            num_train_epochs=3,
            weight_decay=0.01,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            use_cpu=True # Configured for CPU since we don't have CUDA installed by default
        )
        
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=test_dataset,
            tokenizer=self.tokenizer,
        )
        
        print("Starting DistilBERT fine-tuning...")
        trainer.train()
        
        trainer.save_model("./ml/models/distilbert_finetuned")
        print("Training complete.")

if __name__ == "__main__":
    pipeline = DistilBertPipeline()
    pipeline.train()
