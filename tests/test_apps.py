import importlib.util,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("validate_apps",ROOT/"tools"/"validate_apps.py")
validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
class AppCatalogueTests(unittest.TestCase):
 def test_manifests(self):self.assertEqual(validator.validate(),[])
 def test_phase_counts(self):self.assertEqual(len(validator.CORE),8);self.assertEqual(len(validator.EXTENDED),5)
if __name__=="__main__":unittest.main()
