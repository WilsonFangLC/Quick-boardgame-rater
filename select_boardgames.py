import csv

def select_boardgames(input_csv, output_csv):
    with open(input_csv, newline='', encoding='utf-8') as f:
        # Skip blank lines at the start
        lines = [line for line in f if line.strip()]
    reader = list(csv.DictReader(lines))

    # Convert fields to correct types
    for row in reader:
        row['Year'] = int(row['Year']) if row['Year'] else 0
        row['Average'] = float(row['Average']) if row['Average'] else 0.0
        row['Bayes average'] = float(row['Bayes average']) if row['Bayes average'] else 0.0
        row['Users rated'] = int(row['Users rated']) if row['Users rated'] else 0

    def get_top(field, n, n_new):
        # n: normal threshold, n_new: threshold for games >=2020
        sorted_rows = sorted(reader, key=lambda r: r[field], reverse=True)
        selected = set()
        # Select for games published before 2020
        count = 0
        for row in sorted_rows:
            year = int(row['Year']) if row['Year'] else 0
            if year < 2020:
                selected.add(row['ID'])
                count += 1
                if count >= n:
                    break
        # Select for games published in or after 2020
        count_new = 0
        for row in sorted_rows:
            year = int(row['Year']) if row['Year'] else 0
            if year >= 2020:
                selected.add(row['ID'])
                count_new += 1
                if count_new >= n_new:
                    break
        return selected

    top_bayes = get_top('Bayes average', 500, 1000)
    top_avg = get_top('Average', 500, 1000)
    top_votes = get_top('Users rated', 500, 1000)

    all_ids = top_bayes | top_avg | top_votes
    selected_rows = [row for row in reader if row['ID'] in all_ids]

    # Write to output
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=reader[0].keys())
        writer.writeheader()
        writer.writerows(selected_rows)

if __name__ == '__main__':
    select_boardgames('updated_bgg_top5000_images.csv', 'selected_boardgames.csv')
