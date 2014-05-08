#!/usr/bin/env python

import csv
import datetime
import json
import math
import re

from urlparse import urlparse, parse_qs

from typogrify.filters import smartypants

import requests

import app_config

def download():
    """
    Downloads the speeches CSV from google docs.
    """
    csv_url = 'https://docs.google.com/spreadsheets/d/%s/export?format=csv&id=%s&gid=0' % (
        app_config.DATA_GOOGLE_DOC_KEY,
        app_config.DATA_GOOGLE_DOC_KEY)
    r = requests.get(csv_url)

    with open('data/data.csv', 'wb') as writefile:
        writefile.write(r.content)

def slugify(row):
    bits = []

    for field in ('name', 'school', 'year'):
        d = row[field]

        if d:
            d = str(d)
            d = d.lower()
            d = re.sub(r"[^\w\s]", '', d)
            d = re.sub(r"\s+", '-', d)

            bits.append(d)

    slug = '-'.join(bits) 

    return slug

def parse():
    """
    Parses the data CSV to JSON.
    """
    with open('data/data.csv', 'rb') as readfile:
        rows = list(csv.DictReader(readfile))

    print "Start parse(): %i rows." % len(rows)

    speeches = []
    speeches_by_tag = {}

    for row in rows:
        for k, v in row.items():
            row[k] = v.strip()

        row['year'] = None
        row['decade'] = None
        row['youtube_id'] = None
        row['vimeo_id'] = None

        if row['date']: 
            try:
                month, day, year = map(int, row['date'].split('/'))
                row['year'] = year
                row['decade'] = math.floor(year / 10) * 10

                d = datetime.date(year, month, day)

                row['date'] = '%s %i, %i' % (d.strftime('%B'), day, year) 
            except ValueError:
                print 'Invalid date for %(name)s at %(school)s' % row
        else:
            print 'No date for %(name)s at %(school)s' % row 
            row['date'] = None

        if row['video_url']:
            o = urlparse(row['video_url'])

            if o.netloc.find('youtu') >= 0:
                if parse_qs(o.query):
                    row['youtube_id'] = parse_qs(o.query)['v'][0]
                else:
                    row['youtube_id'] = o.path.split('/')[-1]
            elif o.netloc.find('vimeo') >= 0:
                row['vimeo_id'] = o.path.split('/')[-1]

        for k in ['money_quote', 'money_quote2']:
            if row[k]:
                row[k] = smartypants(row[k].strip('"'))

        tags = [t.strip().lower() for t in row['take_homes'].replace(',', ';').split(';')]
        row['tags'] = []

        for tag in tags:
            if not tag:
                continue

            if tag not in app_config.TAGS:
                print 'Unrecognized tag: %s' % t
            else:
                row['tags'].append(tag)

                if tag not in speeches_by_tag:
                    speeches_by_tag[tag] = [] 
            
                speeches_by_tag[tag].append(row)

        row['slug'] = slugify(row)

        speeches.append(row)

    # Generate related speeches
    for speech in speeches:
        speech['related'] = {}

        for tag in speech['tags']:
            speech['related'][tag] = []

            for tag_speech in speeches_by_tag[tag]:
                if tag_speech['slug'] != speech['slug']:
                    speech['related'][tag].append({
                        'slug': tag_speech['slug'],
                        'name': tag_speech['name']
                    })

    # Render complete data
    with open('www/static-data/data.json', 'w') as f:
        f.write(json.dumps(speeches))

    thin_speeches = []

    for speech in speeches:
        thin_speeches.append({
            'slug': speech['slug'],
            'name': speech['name'],
            'school': speech['school'],
            'tags': speech['tags'],
            'year': speech['year']
        })

    # Render thin data for index
    with open('www/static-data/data-thin.json', 'w') as f:
        f.write(json.dumps(thin_speeches))

    print "Finished."

def load():
    """
    Load the parsed JSON.
    """
    with open('www/static-data/data.json') as f:
        data = json.load(f)

    return data 
