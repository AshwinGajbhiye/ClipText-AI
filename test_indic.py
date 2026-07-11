from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate
import re

text = "कृष्ण, तुम्हारी बांसुरी सबको अपनी ओर क्यों बुलाती है? क्योंकि ये दिल से सुनी जाती है।"
itrans = transliterate(text, sanscript.DEVANAGARI, sanscript.ITRANS)
clean = itrans.replace('A', 'a').replace('I', 'i').replace('U', 'u').replace('RRi', 'ri').replace('RRI', 'ri').replace('LLi', 'li').replace('LLI', 'li').replace('M', 'n').replace('H', 'h').replace('Sh', 'sh').replace('shh', 'sh').replace('ch', 'ch').replace('chh', 'chh').replace('JN', 'n').replace('~N', 'n').replace('N', 'n').replace('T', 't').replace('Th', 'th').replace('D', 'd').replace('Dh', 'dh').replace('sh', 'sh').replace('S', 's').lower()

clean = re.sub(r'[^a-z0-9\s\,\.\?\!]', '', clean)
print("Clean:", clean)
