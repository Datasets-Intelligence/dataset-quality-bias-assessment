

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.metrics import accuracy_score, r2_score
from sklearn.impute import SimpleImputer
import warnings

warnings.filterwarnings('ignore')


class DatasetAnalyzer:
    """
    Core analyzer for dataset quality and bias assessment.
    """
    
    def __init__(self, correlation_threshold: float = 0.8,
                 imbalance_ratio: float = 0.3,
                 overfitting_threshold: float = 0.15,
                 fairness_gap_threshold: float = 0.1):
        
        self.correlation_threshold = correlation_threshold
        self.imbalance_ratio = imbalance_ratio
        self.overfitting_threshold = overfitting_threshold
        self.fairness_gap_threshold = fairness_gap_threshold
        
    def analyze(self, file_path: str, target_column: str) -> Dict[str, Any]:
        
        result = {
            'validation_status': 'pending',
            'dataset_statistics': {},
            'quality_issues': {},
            'model_metrics': {},
            'bias_findings': {},
            'warnings': [],
            'recommendations': []
        }
        
        try:
            # Step 1: Validate input
            validation_error = self._validate_input(file_path, target_column)
            if validation_error:
                result['validation_status'] = 'failed'
                result['warnings'].append(validation_error)
                return result
            
            # Step 2: Load dataset
            df = pd.read_csv(file_path)
            
            # Verify target column exists
            if target_column not in df.columns:
                result['validation_status'] = 'failed'
                result['warnings'].append(f"Target column '{target_column}' not found in dataset")
                return result
            
            result['validation_status'] = 'passed'
            
            # Step 3: Dataset statistics
            result['dataset_statistics'] = self._get_dataset_statistics(df, target_column)
            
            # Step 4: Quality analysis
            result['quality_issues'] = self._analyze_quality(df, target_column)
            
            # Step 5: Model evaluation
            model_results = self._evaluate_baseline_model(df, target_column)
            result['model_metrics'] = model_results['metrics']
            
            # Step 6: Overfitting check
            overfitting_result = self._check_overfitting(model_results['metrics'])
            if overfitting_result:
                result['warnings'].append(overfitting_result)
            
            # Step 7: Bias analysis
            bias_results = self._analyze_bias(df, target_column, model_results)
            result['bias_findings'] = bias_results
            
            # Step 8: Generate recommendations
            result['recommendations'] = self._generate_recommendations(
                result['quality_issues'],
                result['model_metrics'],
                result['bias_findings']
            )
            
        except Exception as e:
            result['validation_status'] = 'error'
            result['warnings'].append(f"Analysis error: {str(e)}")
        
        return result
    
    def _validate_input(self, file_path: str, target_column: str) -> Optional[str]:
        """
        Validate input file and parameters.
        
        Returns:
            Error message if validation fails, None otherwise
        """
        # Check file extension
        if not file_path.lower().endswith('.csv'):
            return "Only CSV files are supported"
        
        # Check if file is readable
        try:
            df = pd.read_csv(file_path, nrows=1)
            if df.empty:
                return "File is empty"
        except FileNotFoundError:
            return "File not found"
        except pd.errors.EmptyDataError:
            return "File is empty"
        except Exception as e:
            return f"Unable to read file: {str(e)}"
        
        # Check target column name is provided
        if not target_column or not isinstance(target_column, str):
            return "Target column name must be provided"
        
        return None
    
    def _get_dataset_statistics(self, df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
        """
        Compute basic dataset statistics.
        """
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        numerical_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
        
        return {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'feature_count': len(X.columns),
            'numerical_features': numerical_cols,
            'categorical_features': categorical_cols,
            'target_column': target_column,
            'target_type': 'numerical' if pd.api.types.is_numeric_dtype(y) else 'categorical'
        }
    
    def _analyze_quality(self, df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
        """
        Perform comprehensive quality analysis.
        """
        quality_issues = {}
        
        # Missing values analysis
        quality_issues['missing_values'] = self._check_missing_values(df)
        
        # Duplicate detection
        quality_issues['duplicates'] = self._check_duplicates(df)
        
        # Class distribution (for classification)
        quality_issues['class_distribution'] = self._check_class_distribution(df[target_column])
        
        # Outlier detection
        quality_issues['outliers'] = self._detect_outliers(df, target_column)
        
        # Data leakage detection
        quality_issues['potential_leakage'] = self._detect_data_leakage(df, target_column)
        
        return quality_issues
    
    def _check_missing_values(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze missing values in dataset.
        """
        missing_counts = df.isnull().sum()
        missing_percentages = (missing_counts / len(df)) * 100
        
        missing_info = []
        for col in df.columns:
            if missing_counts[col] > 0:
                missing_info.append({
                    'column': col,
                    'count': int(missing_counts[col]),
                    'percentage': round(missing_percentages[col], 2)
                })
        
        return {
            'has_missing': bool(len(missing_info) > 0),
            'total_missing_cells': int(missing_counts.sum()),
            'columns_with_missing': missing_info
        }
    
    def _check_duplicates(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Detect duplicate rows.
        """
        duplicate_count = df.duplicated().sum()
        
        return {
            'has_duplicates': bool(duplicate_count > 0),
            'duplicate_count': int(duplicate_count),
            'duplicate_percentage': round((duplicate_count / len(df)) * 100, 2)
        }
    
    def _check_class_distribution(self, target: pd.Series) -> Dict[str, Any]:
        """
        Analyze class distribution and detect imbalance.
        """
        if not pd.api.types.is_numeric_dtype(target) or target.nunique() <= 10:
            # Treat as categorical
            value_counts = target.value_counts()
            total = len(target)
            
            distribution = []
            for class_val, count in value_counts.items():
                distribution.append({
                    'class': str(class_val),
                    'count': int(count),
                    'percentage': round((count / total) * 100, 2)
                })
            
            # Check for imbalance
            min_class_ratio = value_counts.min() / total
            is_imbalanced = bool(min_class_ratio < self.imbalance_ratio)
            
            return {
                'is_classification': True,
                'num_classes': len(value_counts),
                'distribution': distribution,
                'is_imbalanced': is_imbalanced,
                'minority_class_ratio': round(min_class_ratio, 3)
            }
        else:
            # Regression target
            return {
                'is_classification': False,
                'target_statistics': {
                    'mean': round(float(target.mean()), 2),
                    'std': round(float(target.std()), 2),
                    'min': round(float(target.min()), 2),
                    'max': round(float(target.max()), 2)
                }
            }
    
    def _encode_and_impute_features(self, X: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, LabelEncoder], Dict[str, SimpleImputer], List[str], List[str]]:
       
        X_processed = X.copy()
        cat_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
        num_cols = X.select_dtypes(include=[np.number]).columns.tolist()

        encoders: Dict[str, LabelEncoder] = {}
        imputers: Dict[str, SimpleImputer] = {}

        for col in cat_cols:
            le = LabelEncoder()
            X_processed[col] = le.fit_transform(X[col].astype(str))
            encoders[col] = le

        if num_cols:
            num_imputer = SimpleImputer(strategy='median')
            X_processed[num_cols] = num_imputer.fit_transform(X_processed[num_cols])
            imputers['num'] = num_imputer
        if cat_cols:
            cat_imputer = SimpleImputer(strategy='most_frequent')
            X_processed[cat_cols] = cat_imputer.fit_transform(X_processed[cat_cols])
            imputers['cat'] = cat_imputer

        return X_processed, encoders, imputers, cat_cols, num_cols

    def _detect_outliers(self, df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
        """
        Detect outliers using IQR method on numerical features.
        """
        X = df.drop(columns=[target_column])
        numerical_cols = X.select_dtypes(include=[np.number]).columns
        
        outlier_info = []
        
        for col in numerical_cols:
            Q1 = X[col].quantile(0.25)
            Q3 = X[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = X[(X[col] < lower_bound) | (X[col] > upper_bound)][col]
            
            if len(outliers) > 0:
                outlier_info.append({
                    'column': col,
                    'outlier_count': len(outliers),
                    'outlier_percentage': round((len(outliers) / len(X)) * 100, 2)
                })
        
        return {
            'has_outliers': bool(len(outlier_info) > 0),
            'columns_with_outliers': outlier_info
        }
    
    def _detect_data_leakage(self, df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
        """
        Detect potential data leakage by analyzing feature-target correlations.
        """
        X = df.drop(columns=[target_column])
        y = df[target_column]

        # Reuse shared encoding/imputation helper (imputation not critical for corr but safe)
        X_encoded, encoders, _, _, _ = self._encode_and_impute_features(X)

        # Encode target if categorical
        if not pd.api.types.is_numeric_dtype(y):
            le_target = LabelEncoder()
            y_encoded = le_target.fit_transform(y.astype(str))
        else:
            y_encoded = y
        
        # Calculate correlations
        suspicious_features = []
        
        for col in X_encoded.columns:
            try:
                correlation = np.corrcoef(X_encoded[col], y_encoded)[0, 1]
                if abs(correlation) > self.correlation_threshold:
                    suspicious_features.append({
                        'feature': col,
                        'correlation': round(float(correlation), 4)
                    })
            except:
                # Skip if correlation cannot be computed
                continue

        return {
            'potential_leakage_detected': bool(len(suspicious_features) > 0),
            'suspicious_features': suspicious_features
        }

    def _evaluate_baseline_model(self, df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
        """
        Train and evaluate a baseline model.
        """
        X = df.drop(columns=[target_column])
        y = df[target_column]

        # Preprocess features consistently
        X_processed, encoders, imputers, cat_cols, num_cols = self._encode_and_impute_features(X)

        # Determine problem type
        is_classification = (not pd.api.types.is_numeric_dtype(y)) or (y.nunique() <= 10)

        if is_classification:
            le_target = LabelEncoder()
            y_encoded = le_target.fit_transform(y.astype(str))
            model = DecisionTreeClassifier(max_depth=5, random_state=42) if len(df) < 1000 else LogisticRegression(max_iter=1000, random_state=42)
        else:
            y_encoded = y
            model = DecisionTreeRegressor(max_depth=8, random_state=42)

        # Split data
        stratify_arg = y_encoded if is_classification else None
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y_encoded, test_size=0.2, random_state=42, stratify=stratify_arg
        )

        # Train model
        model.fit(X_train, y_train)

        # Evaluate
        train_pred = model.predict(X_train)
        test_pred = model.predict(X_test)

        if is_classification:
            train_score = accuracy_score(y_train, train_pred)
            test_score = accuracy_score(y_test, test_pred)
            metric_name = 'accuracy'
        else:
            train_score = r2_score(y_train, train_pred)
            test_score = r2_score(y_test, test_pred)
            metric_name = 'r2'

        return {
            'model': model,
            'X_test': X_test,
            'y_test': y_test,
            'y_pred': test_pred,
            'test_indices': X_test.index,
            'metrics': {
                'problem_type': 'classification' if is_classification else 'regression',
                'model_type': type(model).__name__,
                'metric': metric_name,
                'train_score': round(train_score, 4),
                'test_score': round(test_score, 4),
                'train_test_gap': round(train_score - test_score, 4)
            }
        }
    
    def _check_overfitting(self, metrics: Dict[str, Any]) -> Optional[str]:
        """
        Check for signs of overfitting.
        """
        gap = metrics.get('train_test_gap', 0)
        metric = metrics.get('metric', 'accuracy')

        if gap > self.overfitting_threshold:
            return f"Potential overfitting detected: train-test {metric} gap is {gap:.2%}"

        return None
    
    def _analyze_bias(self, df: pd.DataFrame, target_column: str, model_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze potential bias in sensitive attributes (classification only).
        """
        if model_results.get('metrics', {}).get('problem_type') != 'classification':
            return {
                'bias_analysis_performed': False,
                'reason': 'Bias analysis skipped for regression targets'
            }

        # Common sensitive attribute names
        sensitive_keywords = ['gender', 'sex', 'age', 'race', 'ethnicity', 'religion']

        X = df.drop(columns=[target_column])

        # Find potential sensitive attributes
        sensitive_attrs = []
        for col in X.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in sensitive_keywords):
                sensitive_attrs.append(col)

        if not sensitive_attrs:
            return {
                'bias_analysis_performed': False,
                'reason': 'No sensitive attributes detected in dataset'
            }

        # Prepare test split info
        X_test = model_results.get('X_test')
        y_test = model_results.get('y_test')
        y_pred = model_results.get('y_pred')
        test_indices = model_results.get('test_indices')

        bias_results = []

        for attr in sensitive_attrs:
            if df[attr].nunique() <= 10 and X_test is not None:
                bias_info = self._compute_group_fairness(
                    df, target_column, attr, test_indices, y_test, y_pred
                )
                if bias_info:
                    bias_results.append(bias_info)

        return {
            'bias_analysis_performed': True,
            'sensitive_attributes_found': sensitive_attrs,
            'bias_metrics': bias_results if bias_results else []
        }
    
    def _compute_group_fairness(self, df: pd.DataFrame, target_column: str, sensitive_attr: str,
                                 test_indices: Any, y_test: Any, y_pred: Any) -> Optional[Dict[str, Any]]:
        """
        Compute group-level accuracy on the held-out test set and flag disparities.
        """
        try:
            if test_indices is None or y_test is None or y_pred is None:
                return None

            test_groups = df.loc[test_indices, sensitive_attr]
            unique_groups = test_groups.unique()
            if len(unique_groups) < 2:
                return None

            group_metrics = []

            for group in unique_groups:
                mask = test_groups == group
                group_size = int(mask.sum())
                if group_size < 5:  # skip very small groups to avoid noise
                    continue
                group_accuracy = accuracy_score(y_test[mask], y_pred[mask])
                group_metrics.append({
                    'group': str(group),
                    'size': group_size,
                    'percentage_of_test': round((group_size / len(test_groups)) * 100, 2),
                    'accuracy': round(float(group_accuracy), 4),
                    'metric': 'accuracy'
                })

            if not group_metrics:
                return None

            accuracies = [g['accuracy'] for g in group_metrics]
            max_acc, min_acc = max(accuracies), min(accuracies)
            disparity = max_acc - min_acc

            return {
                'attribute': sensitive_attr,
                'groups': group_metrics,
                'performance_disparity': bool(disparity > self.fairness_gap_threshold),
                'max_minus_min_accuracy': round(disparity, 4)
            }

        except Exception:
            return None
    
    def _generate_recommendations(self, quality_issues: Dict, model_metrics: Dict, bias_findings: Dict) -> List[str]:
        """
        Generate actionable recommendations based on analysis.
        """
        recommendations = []
        
        # Missing values
        if quality_issues['missing_values']['has_missing']:
            recommendations.append(
                f"Handle missing values: {quality_issues['missing_values']['total_missing_cells']} missing cells detected. "
                "Current analysis used median/mode imputation; refine with domain-specific methods if needed."
            )
        
        # Duplicates
        if quality_issues['duplicates']['has_duplicates']:
            recommendations.append(
                f"Remove {quality_issues['duplicates']['duplicate_count']} duplicate rows "
                f"({quality_issues['duplicates']['duplicate_percentage']:.1f}% of dataset)."
            )
        
        # Class imbalance
        class_dist = quality_issues['class_distribution']
        if class_dist.get('is_imbalanced'):
            recommendations.append(
                f"Address class imbalance: minority class represents only "
                f"{class_dist['minority_class_ratio']:.1%} of data. "
                "Consider resampling techniques (SMOTE, undersampling) or class weights."
            )
        
        # Outliers
        if quality_issues['outliers']['has_outliers']:
            outlier_cols = [col['column'] for col in quality_issues['outliers']['columns_with_outliers']]
            recommendations.append(
                f"Review outliers in columns: {', '.join(outlier_cols[:3])}. "
                "Determine if they are errors or valid extreme values."
            )
        
        # Data leakage
        if quality_issues['potential_leakage']['potential_leakage_detected']:
            suspicious = quality_issues['potential_leakage']['suspicious_features']
            features = [f['feature'] for f in suspicious[:3]]
            recommendations.append(
                f"Investigate potential data leakage in features: {', '.join(features)}. "
                "These features have unusually high correlation with the target."
            )
        
        # Overfitting
        if model_metrics.get('train_test_gap', 0) > self.overfitting_threshold:
            recommendations.append(
                "Model shows signs of overfitting. Consider: reducing model complexity, "
                "adding regularization, collecting more data, or early stopping."
            )
        
        # Bias
        if bias_findings.get('bias_analysis_performed'):
            for bias_metric in bias_findings.get('bias_metrics', []):
                if bias_metric.get('performance_disparity'):
                    recommendations.append(
                        f"Performance disparity detected for '{bias_metric['attribute']}': "
                        f"max-min group {bias_metric.get('metric', 'accuracy')} gap is {bias_metric['max_minus_min_accuracy']:.2f}. "
                        "Consider fairness-aware techniques or rebalancing."
                    )
        
        if not recommendations:
            recommendations.append("Dataset quality looks good. No major issues detected.")
        
        return recommendations


def analyze_dataset(file_path: str, target_column: str, **kwargs) -> Dict[str, Any]:
   
    analyzer = DatasetAnalyzer(**kwargs)
    return analyzer.analyze(file_path, target_column)


if __name__ == "__main__":
    # Example usage
    print("Dataset Quality and Bias Assessment Module")
    print("=" * 50)
    print("\nUsage example:")
    print("from dataset_analyzer import analyze_dataset")
    print("\nresults = analyze_dataset('data.csv', 'target_column')")
    print("print(results['recommendations'])")
